import * as cdk from 'aws-cdk-lib';
//import { aws_s3 as s3 } from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as s3Notifications from 'aws-cdk-lib/aws-s3-notifications';

import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class AwsHuntersIntegrationCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines the stack:
    // 

    //Variables - Internal:
    // Notes:
    //  - Currently only CloudTrail used in a fixed way but in future we will create the complete structure
    //    associated to each S3 Bucket in the list of Buckets (Enforce by Configuration)
    //
    let MainAWSAccount: string = "903958141776"; 
    let ListOfS3Buckets: string[] = [
      `tlz-cloudtrail-central-${MainAWSAccount}`,
      `tlz-config-central-${MainAWSAccount}`,
      `tlz-guardduty-central-${MainAWSAccount}`,
      `tlz-vpc-flowlogs-central-${MainAWSAccount}`,
    ]

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
    const CloudtrailLogsEventTopic = new sns.Topic(this, 'CloudtrailLogsEventTopic', {
      topicName: 'cloudtrail-logs-notify'
    });

    // Bind the SQS Queue to the SNS Topic.
    const HuntersCloudTrailsQueueSubscription = new snsSubscriptions.SqsSubscription(HuntersCloudTrailsQueue, {
      rawMessageDelivery: true
    });

    CloudtrailLogsEventTopic.addSubscription(HuntersCloudTrailsQueueSubscription);


    // Create the S3 Bucket:
    // Notes:
    //  - remove policy and auto delete are configured to avoid "delete" the bucket content
    //    as protection in PROD envs.
    //  - Versioning disabled: Once it's enable no more possible disable it
    //
    const CloudTrailBucket = new s3.Bucket(this, ListOfS3Buckets[0], {
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      versioned: false
    });

    // Binds the S3 bucket to the SNS Topic.
    // Note:
    //  - At this moment only creation object will be supported
    //  - Unfortunately localstack freetier doesn't allow test this correctly
    //    . Notification is not supported at this layer
    //
    CloudTrailBucket.addEventNotification(
      // Modify the `s3.EventType.*` to handle other object operations.
      s3.EventType.OBJECT_CREATED_PUT,
      new s3Notifications.SnsDestination(CloudtrailLogsEventTopic),
    );


    //ADD THE HUNTERS POLICY FOR THE CORRESPONDING S3 BUCKET: WIP 

    //ADD THE ROLE POLICY FOR THE CORRESPONDING S3 BUCKET: WIP
  }
}
