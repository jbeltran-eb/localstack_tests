import * as cdk from 'aws-cdk-lib';
import {CfnParameter} from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Notifications from 'aws-cdk-lib/aws-s3-notifications';

import { Construct } from 'constructs';

export class AwsHuntersIntegrationCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines the stack:
    // 

    //Context Variables/Const:

    //General
    const MainAWSAccount = this.node.tryGetContext('MainAWSAccount');
    const EnableS3SNSEventNotification: boolean = (this.node.tryGetContext('EnableS3SNSEventNotification') === 'false' ? false : true );
    const CreateSQSQueues: boolean = (this.node.tryGetContext('CreateSQSQueues') === 'false' ? false : true);
    const CreateListOfS3Buckets: boolean = (this.node.tryGetContext('CreateListOfS3Buckets') === 'false' ? false : true);
    
    console.log('-- ENABLED FEATURES --');
    console.log('Create List of S3 Buckets: %s',CreateListOfS3Buckets);
    console.log('Create SQS Queues: %s', CreateSQSQueues);
    console.log('Enable S3 SNS Event Notifications: %s',EnableS3SNSEventNotification);
    console.log('--- END ---')

    //Hunters
    const HunterBucketBaseName = this.node.tryGetContext('HuntersBucketBaseName');
    const HuntersBucketName	= `${HunterBucketBaseName}-${MainAWSAccount}`;
    const HuntersAccountId	= this.node.tryGetContext('HuntersAccountId');
    const HuntersExternalId	= this.node.tryGetContext('HuntersExternalId');
    const HuntersKmsArns = this.node.tryGetContext('HuntersKmsArns');
    const HuntersIamPolicyName	= this.node.tryGetContext('HuntersIamPolicyName');
    const HuntersRoleName	= this.node.tryGetContext('HuntersRoleName');

    //Wiz
    const WizBucketBaseName = this.node.tryGetContext('WizBucketBaseName');
    const WizBucketName = `${WizBucketBaseName}-${MainAWSAccount}`
    const WizAccountId=this.node.tryGetContext('WizAccountId');
    const WizExternalId=this.node.tryGetContext('WizExternalId');
    const WizAllowCloudTrailBucketAccessIamPolicyName=this.node.tryGetContext('WizAllowCloudTrailBucketAccessIamPolicyName')
    const WizRoleName=this.node.tryGetContext('WizRoleName');

    // Global Dynamic Vars:
    // (Organized by Resource)
    //
    let ListOfS3Buckets: string[] = [
      `tlz-cloudtrail-central-${MainAWSAccount}`,
      `tlz-config-central-${MainAWSAccount}`,
      `tlz-guardduty-central-${MainAWSAccount}`,
      `tlz-vpc-flowlogs-central-${MainAWSAccount}`,
    ];

    let TLZCloudTrailBucket: any;
    let TLZConfigBucket: any;
    let TLZGuardDutyBucket: any;
    let TLZVPCFlowLogsBucket: any;

    let TLZCloudtrailLogsEventTopic: any;
    let TLZConfigLogsEventTopic: any;
    let TLZGuardDutyLogsEventTopic: any;
    let TLZVPCFlowLogsEventTopic: any;

    let HuntersCloudTrailsQueue: any;
    let WizCloudTrailsQueue: any;
    let HuntersCloudTrailsQueueSubscription: any;
    let WizCloudTrailsQueueSubscription: any;

    // Create the S3 Buckets:
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

    }

    //Create the SNS Topics:
    //
    if (CreateListOfS3Buckets){

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
    if (EnableS3SNSEventNotification && CreateListOfS3Buckets){

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

    //Create the SQS Queues:
    //
    if (CreateSQSQueues){
      //Hunters:
      HuntersCloudTrailsQueue = new sqs.Queue(this, 'HuntersCloudTrailQueue', {
        queueName: 'hunters-cloudtrail-logs-queue',
        //visibilityTimeout: Duration.days(4),
      });

      //WIZ:
      WizCloudTrailsQueue = new sqs.Queue(this, 'WizCloudTrailQueue', {
        queueName: 'wiz-cloudtrail-logs-queue',
        //visibilityTimeout: Duration.days(4),
      });

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

    // CloudTrail Bucket Policy: - SNS Notify
    //
    const CloudTrailBucketPolicyStatements = [
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
    
    TLZCloudtrailLogsEventTopicPolicy.document.addStatements(CloudTrailBucketPolicyStatements[0]);

    // HUNTERs POLICY:
    //
    const HuntersPolicyStatements = [
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
          `arn:aws:s3:::${HuntersBucketName}`,
          `arn:aws:s3:::${HuntersBucketName}/*`

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
      HuntersPolicyStatements.push(new iam.PolicyStatement({
        sid: 'BucketsDecrypt',
        effect: iam.Effect.ALLOW,
        actions: ['kms:Decrypt'],
        resources: [ `${HuntersKmsArns}` ],
      }));
    }

    const HuntersIamPolicy = new iam.Policy(this, 'HuntersIamPolicy', {
      statements: HuntersPolicyStatements,
      policyName: HuntersIamPolicyName
    });

    //WIZ POLICY
    //
    const WizAllowCloudTrailBucketAccessStatements = [
      new iam.PolicyStatement({
        sid: 'AllowWizAccessCloudtrailS3ListGetLocation',
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetBucketLocation',
          's3:ListBucket'
        ],
        resources: [`arn:aws:s3:::${WizBucketName}`],
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
        resources: [`arn:aws:s3:::${WizBucketName}/*`],
        conditions: {
          'Bool': {
            'aws:SecureTransport': 'true'
          }
        }
      }),
    ];

    const WizAllowCloudTrailBucketAccessIamPolicy = new iam.Policy(this, 'WizAllowCloudTrailBucketAccessIamPolicy', {
      statements: WizAllowCloudTrailBucketAccessStatements,
      policyName: WizAllowCloudTrailBucketAccessIamPolicyName
    });

    //ATTACHING ROLES AND POLICIES
    //

    //HUNTERs:
    HuntersIamPolicy.attachToRole(HuntersIamRole);

    //WIZ:
    WizAllowCloudTrailBucketAccessIamPolicy.attachToRole(WizAccessIamRole);

  } //constructor
} // main class
