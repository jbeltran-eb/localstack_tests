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

    //Context Variables:

    //General
    const MainAWSAccount = this.node.tryGetContext('MainAWSAccount')
    const EnableS3SNSEventNotification = this.node.tryGetContext('EnableS3SNSEventNotification')
    const CreateSQSQueues = this.node.tryGetContext('CreateSQSQueues')
    const CreateListOfS3Buckets = this.node.tryGetContext('CreateListOfS3Buckets')

    //Hunters
    const HunterBucketBaseName = this.node.tryGetContext('HuntersBucketBaseName')
    const HuntersBucketName	= `${HunterBucketBaseName}-${MainAWSAccount}`
    const HuntersAccountId	= this.node.tryGetContext('HuntersAccountId')
    const HuntersExternalId	= this.node.tryGetContext('HuntersExternalId')
    const HuntersKmsArns = this.node.tryGetContext('HuntersKmsArns')
    const HuntersIamPolicyName	= this.node.tryGetContext('HuntersIamPolicyName')
    const HuntersRoleName	= this.node.tryGetContext('HuntersRoleName')

    // Dynamic Global Vars:
    // (Organized by Resource)
    //
    let ListOfS3Buckets: string[] = [
      `tlz-cloudtrail-central-${MainAWSAccount}`,
      `tlz-config-central-${MainAWSAccount}`,
      `tlz-guardduty-central-${MainAWSAccount}`,
      `tlz-vpc-flowlogs-central-${MainAWSAccount}`,
    ]
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

      // Hunters
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
    //    In addition, the lambda related code or functionalities using throws errors
    //    during deployment because docker.sock volume is required. Unfortunately
    //    "--volume" option is not mounting required volume under MacOS in localstack-cli 
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

    }

    //POLICY SECTIONs
    // Note: 
    //  - Move to specific and separated construct in future. 
    //

    // HUNTERs:
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

    // Only add when decrypt required:
    if (HuntersKmsArns && HuntersKmsArns.length > 0) {
      HuntersPolicyStatements.push(new iam.PolicyStatement({
        sid: 'BucketsDecrypt',
        effect: iam.Effect.ALLOW,
        actions: ['kms:Decrypt'],
        resources: [ `${HuntersKmsArns}` ],
      }));
    }

    //Note:
    //
    const HuntersIamPolicy = new iam.ManagedPolicy(this, 'IamHuntersPolicy', {
      managedPolicyName: `${HuntersIamPolicyName}`,
      statements: HuntersPolicyStatements,
    });


    //ROLE SECTIONs
    // Note: 
    //  - Move to specific and separated construct in future. 
    //

    //HUNTERs:
    //
    const HuntersIamRole = new iam.Role(this, 'IamHuntersRole', {
      assumedBy: new iam.ArnPrincipal(`arn:aws:iam::${HuntersAccountId}:root`),
      externalIds: [`${HuntersExternalId}`],
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(`${HuntersIamPolicyName}`),
      ],
      roleName: `${HuntersRoleName}`,
    });

  } //constructor
} // main class
