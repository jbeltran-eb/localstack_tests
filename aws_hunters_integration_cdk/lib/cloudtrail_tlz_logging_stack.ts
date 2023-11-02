import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Notifications from 'aws-cdk-lib/aws-s3-notifications';
import { Construct } from 'constructs';
import { TLZLoggingStackContextCloudtrailParamType } from './custom_types/tlz_logging_stack_custom_types'

interface CloudtrailTLZCoreLoggingStackProps extends cdk.StackProps {
    cloudtrail_tlz_logging_stack_params: TLZLoggingStackContextCloudtrailParamType;
    main_aws_account: string;
    main_aws_region: string;
    tlz_cloudtrail_logs_event_topic: sns.ITopic;
}

export class CloudtrailTLZCoreLoggingStack extends cdk.NestedStack {
    constructor(scope: Construct, id: string, props: CloudtrailTLZCoreLoggingStackProps) {
        super(scope, id, props)

        //Context Vars:
        const CreateBucket: boolean = props.cloudtrail_tlz_logging_stack_params.CloudTrail.CreateBucket;
        const MainAWSAccount: string = props.main_aws_account;
        const MainAWSRegion: string = props.main_aws_region;
        const BucketName: string = `${props.cloudtrail_tlz_logging_stack_params.CloudTrail.BucketBaseName}-${MainAWSAccount}`;
        const CreateSNSTopic: boolean = props.cloudtrail_tlz_logging_stack_params.CloudTrail.CreateSNSTopic;
        const BucketSNSTopicBaseName: string = props.cloudtrail_tlz_logging_stack_params.CloudTrail.BucketSNSTopicBaseName;
        const EnableS3SNSEventNotification: boolean = props.cloudtrail_tlz_logging_stack_params.CloudTrail.EnableS3SNSEventNotification;

        //Dynamic Local Vars:
        let TLZCloudTrailBucket: s3.IBucket;
        let TLZCloudtrailLogsEventTopic: sns.ITopic = props.tlz_cloudtrail_logs_event_topic;

        //Create or Import S3 Bucket:
        if (CreateBucket){

            TLZCloudTrailBucket = new s3.Bucket(this, BucketName, {
                removalPolicy: cdk.RemovalPolicy.RETAIN,
                autoDeleteObjects: false,
                versioned: false
            });

        }else{

            TLZCloudTrailBucket = s3.Bucket.fromBucketName(this, BucketName, BucketName);

        }

        //Create the SNS Topic or import it:
        //
        if (CreateSNSTopic){

            TLZCloudtrailLogsEventTopic = new sns.Topic(this, 'TLZCloudtrailLogsEventTopic', {
                topicName: BucketSNSTopicBaseName
            });

        }else{ 

            TLZCloudtrailLogsEventTopic = sns.Topic.fromTopicArn(this, 
                'TLZCloudtrailLogsEventTopic',
                `arn:aws:sns:${MainAWSRegion}:${MainAWSAccount}:${BucketSNSTopicBaseName}`
            );

        }

        // Binds the S3 bucket to the SNS Topic via notifications: 
        // [Enable Outside of Localstack DevEnv Only - Use local var]
        // Note:
        //  - Unfortunately localstack free-tier doesn't allow test this correctly.
        //    Notification is not supported at this layer. 
        //  - Currently AWS CDK not allow import S3 Bucket Existing notifications
        //
        if (EnableS3SNSEventNotification){
    
            TLZCloudTrailBucket.addEventNotification(
            // Modify the `s3.EventType.*` to handle other object operations.
            s3.EventType.OBJECT_CREATED_PUT,
            new s3Notifications.SnsDestination(TLZCloudtrailLogsEventTopic),
            );

        };



        //Nested Stack OUTPUTs: - Properties passed as references in current implementation.



    } //constructor
} // NestedStack
