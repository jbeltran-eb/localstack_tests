import * as cdk from 'aws-cdk-lib';
//import { aws_s3 as s3 } from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as s3Notifications from 'aws-cdk-lib/aws-s3-notifications';
import * as iam from 'aws-cdk-lib/aws-iam';

import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class AwsHuntersIntegrationCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines the stack:
    // 

    //Variables - Internal:
    // Notes:
    //  - Currently only used in a fixed way but in future we will create the complete structure
    //    associated to each S3 Bucket in the list of Buckets (Enforce by Configuration)
    //
    let MainAWSAccount: string = "903958141776"; 
    let ListOfS3Buckets: string[] = [
      `tlz-cloudtrail-central-${MainAWSAccount}`,
      `tlz-config-central-${MainAWSAccount}`,
      `tlz-guardduty-central-${MainAWSAccount}`,
      `tlz-vpc-flowlogs-central-${MainAWSAccount}`,
    ]

    let EnableS3SNSEventNotification: boolean = false

    const kmsArns = "arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab"; //Test-Fixed arn, replace for parameter or context in future versions

    //Create the SQS for Hunters:
    const HuntersCloudTrailsQueue = new sqs.Queue(this, 'HuntersCloudTrailQueue', {
      queueName: 'hunters-cloudtrail-logs-queue',
      //visibilityTimeout: Duration.days(4),
    });

    //Create the SQS for WIZ:
    const WizCloudTrailsQueue = new sqs.Queue(this, 'WizCloudTrailQueue', {
      queueName: 'wiz-cloudtrail-logs-queue',
      //visibilityTimeout: Duration.days(4),
    });

    //Create the SNS and Bind for Hunters:
    const TLZCloudtrailLogsEventTopic = new sns.Topic(this, 'TLZCloudtrailLogsEventTopic', {
      topicName: 'cloudtrail-logs-notify'
    });

    // Bind the SQS Queue to the SNS Topic.
    const HuntersCloudTrailsQueueSubscription = new snsSubscriptions.SqsSubscription(HuntersCloudTrailsQueue, {
      rawMessageDelivery: true
    });

    TLZCloudtrailLogsEventTopic.addSubscription(HuntersCloudTrailsQueueSubscription);


    // Create the S3 Buckets:
    // Notes:
    //  - remove policy and auto delete are configured to avoid "delete" the bucket content
    //    as protection in PROD envs.
    //  - Versioning disabled: Once it's enable no more possible disable it
    //
    const TLZCloudTrailBucket = new s3.Bucket(this, ListOfS3Buckets[0], {
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      versioned: false
    });

    const TLZConfigBucket = new s3.Bucket(this, ListOfS3Buckets[1], {
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      versioned: false
    });

    const TLZGuardDutyBucket = new s3.Bucket(this, ListOfS3Buckets[2], {
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      versioned: false
    });

    const TLZVPCFlowLogsBucket = new s3.Bucket(this, ListOfS3Buckets[3], {
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      versioned: false
    });

    // Binds the S3 buckets to the SNS Topics via notifications: 
    // [Enable Outside of Localstack DevEnv Only - Use local var]
    // Note:
    //  - At this moment only creation object will be supported
    //  - Unfortunately localstack freetier doesn't allow test this correctly
    //    . Notification is not supported at this layer. 
    //    In addition, the lambda related code or functionalities using throws errors
    //    during deployment because docker.sock volume is required. Unfortunately
    //    "--volume" option is not mounting required volume under MacOS in localstack-cli 
    //
    if (EnableS3SNSEventNotification){

      TLZCloudTrailBucket.addEventNotification(
        // Modify the `s3.EventType.*` to handle other object operations.
        s3.EventType.OBJECT_CREATED_PUT,
        new s3Notifications.SnsDestination(TLZCloudtrailLogsEventTopic),
      );

      TLZConfigBucket.addEventNotification(
        // Modify the `s3.EventType.*` to handle other object operations.
        s3.EventType.OBJECT_CREATED_PUT,
        new s3Notifications.SnsDestination(TLZCloudtrailLogsEventTopic),
      );

      TLZGuardDutyBucket.addEventNotification(
        // Modify the `s3.EventType.*` to handle other object operations.
        s3.EventType.OBJECT_CREATED_PUT,
        new s3Notifications.SnsDestination(TLZCloudtrailLogsEventTopic),
      );

      TLZVPCFlowLogsBucket.addEventNotification(
        // Modify the `s3.EventType.*` to handle other object operations.
        s3.EventType.OBJECT_CREATED_PUT,
        new s3Notifications.SnsDestination(TLZCloudtrailLogsEventTopic),
      );

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
          `arn:aws:s3:::${ListOfS3Buckets[0]}`,
          `arn:aws:s3:::${ListOfS3Buckets[0]}/*`  
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
    if (kmsArns && kmsArns.length > 0) {
      HuntersPolicyStatements.push(new iam.PolicyStatement({
        sid: 'BucketsDecrypt',
        effect: iam.Effect.ALLOW,
        actions: ['kms:Decrypt'],
        resources: [ `${kmsArns}` ],
      }));
    }

    //Note:
    // - Review the desired policy name, recommended use something with 
    //   a unique id. i.e in original CFN: hunters-integration-policy-76d0638c
    //
    new iam.ManagedPolicy(this, 'IamHuntersPolicy', {
      managedPolicyName: 'hunters-integration-policy',
      statements: HuntersPolicyStatements,
    });


    //ROLE SECTIONs
    // Note: 
    //  - Move to specific and separated construct in future. 
    //


    //HUNTERs:

  }
}
