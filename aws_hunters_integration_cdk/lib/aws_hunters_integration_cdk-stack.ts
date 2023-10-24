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

    //Variables - Internal:
    // Notes:
    //  - Currently only used in a fixed way but in future we will create the complete structure
    //    associated to each S3 Bucket in the list of Buckets (Enforce by Configuration)
    //
    let MainAWSAccount: string = "000000000000" //Replace by real one: "903958141776"; 
    let ListOfS3Buckets: string[] = [
      `tlz-cloudtrail-central-${MainAWSAccount}`,
      `tlz-config-central-${MainAWSAccount}`,
      `tlz-guardduty-central-${MainAWSAccount}`,
      `tlz-vpc-flowlogs-central-${MainAWSAccount}`,
    ]

    let EnableS3SNSEventNotification: boolean = false;

    let CreateSQSQueues: boolean = true; //Currently affects to the SNS Topics creation

    let CreateListOfS3Buckets: boolean = true; //Currently affects to the SNS Topics creation


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

    //Cloudformation Parameters:
    //

    // Hunters Params:
    const HuntersKmsArns = new CfnParameter(this, 'HuntersKmsArns', {
      default: '',
      description: 'KMS ARN when required',
      type: 'String',
      allowedPattern: "arn:aws:kms:(af|ap|ca|eu|me|sa|us)-(central|north|(north(?:east|west))|south|south(?:east|west)|east|west)-\d+:[0-9]{12}:key\/[a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12}",
    }).valueAsString;

    const HuntersExternalId = new CfnParameter(this, 'HuntersExternalId', {
      default: '',
      description: 'Hunters Given External Id',
      type: 'String',
    }).valueAsString;

    const HuntersAccountId = new CfnParameter(this, 'HuntersAccountId', {
      default: '',
      description: 'Hunters AWS Account Id',
      type: 'String',
      allowedPattern: "[0-9]{12}"
    }).valueAsString;

    const HuntersRoleName = new CfnParameter(this, 'HuntersRoleName', {
      default: 'hunters-integration-role',
      description: 'Name for the Hunters Role',
      type: 'String',
    }).valueAsString;

    const HuntersIamPolicyName = new CfnParameter(this, 'HuntersIamPolicyName', {
      default: 'hunters-integration-policy',
      description: 'Name for the Hunters Policy',
      type: 'String',
    }).valueAsString;

    const HuntersBucketNames = new CfnParameter(this, 'HuntersBucketNames', {
      default: `${ListOfS3Buckets[0]}`,
      description: 'List of S3 Buckets for Hunters',
      type: 'CommaDelimitedList',
    }).valueAsList;


    // Create the S3 Buckets:
    // Notes:
    //  - remove policy and auto delete are configured to avoid "delete" the bucket content
    //    as protection in PROD envs.
    //  - Versioning disabled: Once it's enable no more possible disable it
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
    //  - Unfortunately localstack freetier doesn't allow test this correctly
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
          `arn:aws:s3:::${cdk.Fn.select(0, HuntersBucketNames)}`,
          `arn:aws:s3:::${cdk.Fn.select(0, HuntersBucketNames)}/*`

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
    // - Review the desired policy name, recommended use something with 
    //   a unique id. i.e in original CFN: hunters-integration-policy-76d0638c
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
    // Notes:
    //  - Using arn in assumedBy in place of new iam.AccountPrincipal(`${HuntersAccountId}`),
    //
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
