import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Notifications from 'aws-cdk-lib/aws-s3-notifications';
import { custom_context_param_stack_type } from '../lib/custom_types/custom_types'
import * as fs from 'fs';
import { HuntersTLZCoreLoggingStack } from '../lib/hunters_tlz_logging_stack';
import { WizTLZCoreLoggingStack } from '../lib/wiz_tlz_logging_stack';
import { Construct } from 'constructs';

export class MainTLZCoreLoggingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //Context Variables/Constants:

    //Get Context Variables:
    const cdkConfig = JSON.parse(fs.readFileSync('cdk.json', 'utf8'));
    const contextParams = cdkConfig.context;
    console.log('--- GETTING CONTEXT VARIABLES FROM cdk.json ---')
    console.log('Type: %s', typeof contextParams)
    console.log('Type custom_user_stack_params: %s', typeof contextParams['custom_user_stack_params']);
    console.log(contextParams);
    console.log('---')

    //General
    const MainAWSAccount: string                = contextParams['custom_user_stack_params'].MainAWSAccount;
    const CreateListOfS3Buckets: boolean        = contextParams['custom_user_stack_params'].CreateListOfS3Buckets;
    const CreateSNSTopics: boolean              = contextParams['custom_user_stack_params'].CreateSNSTopics;
    const CreateSQSQueues: boolean              = contextParams['custom_user_stack_params'].CreateSQSQueues;
    const EnableS3SNSEventNotification: boolean = contextParams['custom_user_stack_params'].EnableS3SNSEventNotification;

    // CloudTrail
    const CloudTrailBucketName = `${this.node.tryGetContext('CloudTrailBucketBaseName')}-${MainAWSAccount}`

    //Hunters
    const HuntersAccountId                            = contextParams['custom_user_stack_params'].HuntersAccountId;
    const HuntersExternalId                           = contextParams['custom_user_stack_params'].HuntersExternalId;
    const HuntersKmsArns                              = contextParams['custom_user_stack_params'].HuntersKmsArns;
    const HuntersCloudTrailBucketAccessIamPolicyName	= contextParams['custom_user_stack_params'].HuntersCloudTrailBucketAccessIamPolicyName;
    const HuntersRoleName	                            = contextParams['custom_user_stack_params'].HuntersRoleName;

    //Wiz
    const WizAccountId                            = contextParams['custom_user_stack_params'].WizAccountId;
    const WizExternalId                           = contextParams['custom_user_stack_params'].WizExternalId;
    const WizCloudTrailBucketAccessIamPolicyName  = contextParams['custom_user_stack_params'].WizCloudTrailBucketAccessIamPolicyName;
    const WizRoleName                             = contextParams['custom_user_stack_params'].WizRoleName;

    // Global Dynamic Vars:
    // (Organized by Resource)
    //
    let ListOfS3Buckets: string[] = [
      `tlz-cloudtrail-central-${MainAWSAccount}`,
      `tlz-config-central-${MainAWSAccount}`,
      `tlz-guardduty-central-${MainAWSAccount}`,
      `tlz-vpc-flowlogs-central-${MainAWSAccount}`,
    ];

    let TLZCloudTrailBucket: s3.IBucket;
    let TLZConfigBucket: s3.IBucket;
    let TLZGuardDutyBucket: s3.IBucket;
    let TLZVPCFlowLogsBucket: s3.IBucket;

    let TLZCloudtrailLogsEventTopic: any;
    let TLZConfigLogsEventTopic: any;
    let TLZGuardDutyLogsEventTopic: any;
    let TLZVPCFlowLogsEventTopic: any;

    let HuntersCloudTrailsQueue: any;
    let WizCloudTrailsQueue: any;
    let HuntersCloudTrailsQueueSubscription: any;
    let WizCloudTrailsQueueSubscription: any;

    // --- MAIN STACK CREATION --

    //Flag Status Reported from Config
    //
    console.log('-- CONFIGURATION FLAGs FOR STACK APP --');
    console.log('Create List of S3 Buckets: %s'         , CreateListOfS3Buckets);
    console.log('Create SNS Topics: %s'                 , CreateSNSTopics);
    console.log('Create SQS Queues: %s'                 , CreateSQSQueues);
    console.log('Enable S3 SNS Event Notifications: %s' , EnableS3SNSEventNotification);
    console.log('--- END ---')

    // Create (or import) the S3 Buckets:
    //
    if (CreateListOfS3Buckets){

        TLZCloudTrailBucket = new s3.Bucket(this, ListOfS3Buckets[0], {
        removalPolicy: cdk.RemovalPolicy.RETAIN,
        autoDeleteObjects: false,
        versioned: false
      });

        TLZConfigBucket = new s3.Bucket(this, ListOfS3Buckets[1], {
        removalPolicy: cdk.RemovalPolicy.RETAIN,
        autoDeleteObjects: false,
        versioned: false
      });

        TLZGuardDutyBucket = new s3.Bucket(this, ListOfS3Buckets[2], {
        removalPolicy: cdk.RemovalPolicy.RETAIN,
        autoDeleteObjects: false,
        versioned: false
      });

        TLZVPCFlowLogsBucket = new s3.Bucket(this, ListOfS3Buckets[3], {
        removalPolicy: cdk.RemovalPolicy.RETAIN,
        autoDeleteObjects: false,
        versioned: false
      });

    }else{

      TLZCloudTrailBucket = s3.Bucket.fromBucketName(this, ListOfS3Buckets[0], ListOfS3Buckets[0]);
      TLZConfigBucket = s3.Bucket.fromBucketName(this, ListOfS3Buckets[1], ListOfS3Buckets[1]);
      TLZGuardDutyBucket = s3.Bucket.fromBucketName(this, ListOfS3Buckets[2], ListOfS3Buckets[2]);
      TLZVPCFlowLogsBucket = s3.Bucket.fromBucketName(this, ListOfS3Buckets[3], ListOfS3Buckets[3]);

    }

    //Create the SNS Topics:
    //
    if (CreateSNSTopics){

      // CloudTrail:
      TLZCloudtrailLogsEventTopic = new sns.Topic(this, 'TLZCloudtrailLogsEventTopic', {
        topicName: 'cloudtrail-logs-notify'
      });

      // Config Central:
      TLZConfigLogsEventTopic = new sns.Topic(this, 'TLZConfigLogsEventTopic', {
        topicName: 'config-logs-notify'
      });

      // GuardDuty:
      TLZGuardDutyLogsEventTopic = new sns.Topic(this, 'TLZGuardDutyLogsEventTopic', {
        topicName: 'guardduty-logs-notify'
      });

      // VPC-FlowLogs:
      TLZVPCFlowLogsEventTopic = new sns.Topic(this, 'TLZVPCFlowLogsEventTopic', {
        topicName: 'vpcflow-logs-notify'
      });

    }

    // Binds the S3 buckets to the SNS Topics via notifications: 
    // [Enable Outside of Localstack DevEnv Only - Use local var]
    // Note:
    //  - At this moment only creation object will be supported
    //  - Unfortunately localstack free-tier doesn't allow test this correctly
    //    . Notification is not supported at this layer. 
    //
    if (EnableS3SNSEventNotification && CreateSNSTopics){

      TLZCloudTrailBucket.addEventNotification(
        // Modify the `s3.EventType.*` to handle other object operations.
        s3.EventType.OBJECT_CREATED_PUT,
        new s3Notifications.SnsDestination(TLZCloudtrailLogsEventTopic),
      );

      TLZConfigBucket.addEventNotification(
        // Modify the `s3.EventType.*` to handle other object operations.
        s3.EventType.OBJECT_CREATED_PUT,
        new s3Notifications.SnsDestination(TLZConfigLogsEventTopic),
      );

      TLZGuardDutyBucket.addEventNotification(
        // Modify the `s3.EventType.*` to handle other object operations.
        s3.EventType.OBJECT_CREATED_PUT,
        new s3Notifications.SnsDestination(TLZGuardDutyLogsEventTopic),
      );

      TLZVPCFlowLogsBucket.addEventNotification(
        // Modify the `s3.EventType.*` to handle other object operations.
        s3.EventType.OBJECT_CREATED_PUT,
        new s3Notifications.SnsDestination(TLZVPCFlowLogsEventTopic),
      );

    }

    //Create SQS Subscription when required for corresponding SNS Topics
    //
    if (CreateSQSQueues && EnableS3SNSEventNotification){
      //Hunters:
      HuntersCloudTrailsQueueSubscription = new snsSubscriptions.SqsSubscription(HuntersCloudTrailsQueue, {
        rawMessageDelivery: true
      });

      TLZCloudtrailLogsEventTopic.addSubscription(HuntersCloudTrailsQueueSubscription);

      WizCloudTrailsQueueSubscription = new snsSubscriptions.SqsSubscription(WizCloudTrailsQueue, {
        rawMessageDelivery: true
      });

      TLZCloudtrailLogsEventTopic.addSubscription(WizCloudTrailsQueueSubscription);

    }

    //ROLE SECTIONs
    // Note: 
    //  - Move to specific and separated constructs in future. 
    //    when possible
    //

    //HUNTERs:
    //
    const HuntersIamRole = new iam.Role(this, 'HuntersIamRole', {
      assumedBy: new iam.AccountPrincipal(HuntersAccountId),
      externalIds: [HuntersExternalId],
      roleName: HuntersRoleName,
    });

    //WIZ:
    const WizAccessIamRole = new iam.Role(this,'WizAccessIamRole',{
      assumedBy: new iam.AccountPrincipal(WizAccountId),
      externalIds: [WizExternalId],
      roleName: WizRoleName,
    });


    //POLICY SECTIONs
    // Note: 
    //  - Move to specific and separated construct in future. 
    //

    // HUNTERs POLICY:
    //
    const HuntersCloudTrailBucketAccessPolicyStatements = [
      new iam.PolicyStatement({
        sid: 'BucketsAccess',
        effect: iam.Effect.ALLOW,
        actions: [
          's3:ListBucket',
          's3:GetObject',
          's3:GetBucketLocation',
          's3:GetBucketNotification',
          's3:PutBucketNotification',
        ],
        resources: [
          `arn:aws:s3:::${CloudTrailBucketName}`,
          `arn:aws:s3:::${CloudTrailBucketName}/*`

        ],
      }),
      new iam.PolicyStatement({
        sid: 'HuntersIngestionList',
        effect: iam.Effect.ALLOW,
        actions: [
          's3:ListAllMyBuckets',
          'sns:ListTopics',
        ],
        resources: ['*'],
      }),
      new iam.PolicyStatement({
        sid: 'HuntersIngestionNotificationsSetup',
        effect: iam.Effect.ALLOW,
        actions: [
          'sns:ListSubscriptionsByTopic',
          'sns:GetTopicAttributes',
          'sns:SetTopicAttributes',
          'sns:CreateTopic',
          'sns:TagResource',
          'sns:Publish',
          'sns:Subscribe',
        ],
        resources: ['arn:aws:sns:*:*:hunters?ingestion*'],
      }),
      new iam.PolicyStatement({
        sid: 'HuntersIngestionNotificationsTeardown',
        effect: iam.Effect.ALLOW,
        actions: [
          'sns:Unsubscribe',
          'sns:DeleteTopic',
        ],
        resources: ['arn:aws:sns:*:*:hunters?ingestion*'],
      }),
    ];

    // Only add KMS when decrypt required:
    if (HuntersKmsArns && HuntersKmsArns.length > 0) {
      HuntersCloudTrailBucketAccessPolicyStatements.push(new iam.PolicyStatement({
        sid: 'BucketsDecrypt',
        effect: iam.Effect.ALLOW,
        actions: ['kms:Decrypt'],
        resources: [ `${HuntersKmsArns}` ],
      }));
    }

    const HuntersCloudTrailBucketAccessIamPolicy = new iam.Policy(this, 'HuntersCloudTrailBucketAccessIamPolicy', {
      statements: HuntersCloudTrailBucketAccessPolicyStatements,
      policyName: HuntersCloudTrailBucketAccessIamPolicyName
    });

    //WIZ POLICY
    //
    const WizCloudTrailBucketAccessPolicyStatements = [
      new iam.PolicyStatement({
        sid: 'AllowWizAccessCloudtrailS3ListGetLocation',
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetBucketLocation',
          's3:ListBucket'
        ],
        resources: [`arn:aws:s3:::${CloudTrailBucketName}`],
        conditions: {
          'Bool': {
            'aws:SecureTransport': 'true'
          }
        }
      }),
      new iam.PolicyStatement({ 
        sid: 'AllowWizAccessCloudtrailS3Get',
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetObject'
        ],
        resources: [`arn:aws:s3:::${CloudTrailBucketName}/*`],
        conditions: {
          'Bool': {
            'aws:SecureTransport': 'true'
          }
        }
      }),
    ];

    const WizCloudTrailBucketAccessIamPolicy = new iam.Policy(this, 'WizCloudTrailBucketAccessIamPolicy', {
      statements: WizCloudTrailBucketAccessPolicyStatements,
      policyName: WizCloudTrailBucketAccessIamPolicyName
    });

    //ATTACHING ROLES AND POLICIES FOR SPECIFIC PRODUCTs
    //

    //HUNTERs:
    HuntersCloudTrailBucketAccessIamPolicy.attachToRole(HuntersIamRole);

    //WIZ:
    WizCloudTrailBucketAccessIamPolicy.attachToRole(WizAccessIamRole);


    //ATTACHING POLICIES FOR SNS and SQS:

    // CloudTrail Bucket Policy: - SNS Notify
    //
    const CloudTrailBucketPolicyForSNSStatements = [
      new iam.PolicyStatement({
        sid: 'AllowAWSS3Notification',
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('s3.amazonaws.com')],
        actions: ['SNS:Publish'],
        resources: [TLZCloudtrailLogsEventTopic.topicArn],
        conditions: {
          'StringEquals': {
            'aws:SourceAccount': `${MainAWSAccount}`,
          },
          'ArnLike': {
            'aws:SourceArn': `arn:aws:s3:*:*:${ListOfS3Buckets[0]}`,
          },
        },
      }),
    ];

    const TLZCloudtrailLogsEventTopicPolicy = new sns.TopicPolicy(this, 'TLZCloudtrailLogsEventTopicPolicy', {
      topics: [TLZCloudtrailLogsEventTopic],
    });
    
    TLZCloudtrailLogsEventTopicPolicy.document.addStatements(CloudTrailBucketPolicyForSNSStatements[0]);

    // CloudTrail SNS Policy: SQS Notify for Wiz
    const CloudTrailSNSPolicyForSQSWizStatements = [
      new iam.PolicyStatement({
        sid: 'Allow-SNS-SendMessage',
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('sns.amazonaws.com')],
        actions: ['sqs:SendMessage'],
        resources: [WizCloudTrailsQueue.queueArn],
        conditions: {
          ArnEquals: {
            'aws:SourceArn': TLZCloudtrailLogsEventTopic.topicArn,
          },
        },
      }),
      new iam.PolicyStatement({
        sid: 'Allow-WizAccess-RecvDeleteMsg',
        effect: iam.Effect.ALLOW,
        principals: [new iam.ArnPrincipal(WizAccessIamRole.roleArn)],
        actions: ['sqs:DeleteMessage', 'sqs:ReceiveMessage'],
        resources: [WizCloudTrailsQueue.queueArn],
      }),
    ]

    const CloudTrailSNSPolicyForSQSWiz = new sqs.QueuePolicy(this, 'CloudTrailSNSPolicyForSQSWiz', {
      queues: [WizCloudTrailsQueue],
    });

    CloudTrailSNSPolicyForSQSWiz.document.addStatements(CloudTrailSNSPolicyForSQSWizStatements[0],CloudTrailSNSPolicyForSQSWizStatements[1]);

    // CloudTrail SNS Policy: SQS Notify for Hunter
    const CloudTrailSNSPolicyForSQSHunterStatements = [
      new iam.PolicyStatement({
        sid: 'Allow-SNS-SendMessage',
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('sns.amazonaws.com')],
        actions: ['sqs:SendMessage'],
        resources: [HuntersCloudTrailsQueue.queueArn],
        conditions: {
          ArnEquals: {
            'aws:SourceArn': TLZCloudtrailLogsEventTopic.topicArn,
          },
        },
      }),
      new iam.PolicyStatement({
        sid: 'Allow-HuntersAccess-RecvDeleteMsg',
        effect: iam.Effect.ALLOW,
        principals: [new iam.ArnPrincipal(HuntersIamRole.roleArn)],
        actions: ['sqs:DeleteMessage', 'sqs:ReceiveMessage'],
        resources: [HuntersCloudTrailsQueue.queueArn],
      }),
    ]

    const CloudTrailSNSPolicyForSQSHunters = new sqs.QueuePolicy(this, 'CloudTrailSNSPolicyForSQSHunters', {
      queues: [HuntersCloudTrailsQueue],
    });

    CloudTrailSNSPolicyForSQSHunters.document.addStatements(CloudTrailSNSPolicyForSQSHunterStatements[0],CloudTrailSNSPolicyForSQSHunterStatements[1]);


    //HUNTERs NESTED STACK:
    new HuntersTLZCoreLoggingStack(this,
      'HuntersTLZCoreLoggingStack', 
      { 
        custom_user_stack_params: contextParams['custom_user_stack_params'] as custom_context_param_stack_type,
      }
    );

    //WIZ NESTED STACK:
    new WizTLZCoreLoggingStack(this,
      'WizTLZCoreLoggingStack',
      { 
        custom_user_stack_params: contextParams['custom_user_stack_params'] as custom_context_param_stack_type,
      }
    );

  } //constructor
} // main class
