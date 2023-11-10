import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3Notifications from 'aws-cdk-lib/aws-s3-notifications';
import { Construct } from 'constructs';
import { TLZLoggingStackS3AndSNSContextParamType } from './custom_types/tlz_logging_stack_custom_types';

interface CloudtrailTLZCoreLoggingStackProps extends cdk.StackProps {
    cloudtrail_tlz_logging_stack_params: TLZLoggingStackS3AndSNSContextParamType; //TLZLoggingStackContextCloudtrailParamType;
    main_aws_account: string;
    main_aws_region: string;
}

export class CloudtrailTLZCoreLoggingStack extends cdk.NestedStack {
    //Properties
    public TLZCloudTrailBucket: s3.IBucket;
    public TLZCloudtrailLogsEventTopic: sns.ITopic;
    public TLZCloudtrailEnableS3SNSEventNotificationValue: boolean

    //Initialization of Class
    constructor(scope: Construct, id: string, props: CloudtrailTLZCoreLoggingStackProps) {
        super(scope, id, props)

        //Context Vars:
        console.log("Cloudtrail in Nested Stack CloudTrail: %s: ", props.cloudtrail_tlz_logging_stack_params)
        const CreateBucket: boolean = props.cloudtrail_tlz_logging_stack_params.CreateBucket;
        const MainAWSAccount: string = props.main_aws_account;
        const MainAWSRegion: string = props.main_aws_region;
        const BucketName: string = `${props.cloudtrail_tlz_logging_stack_params.BucketBaseName}-${MainAWSAccount}`;
        const CreateSNSTopic: boolean = props.cloudtrail_tlz_logging_stack_params.CreateSNSTopic;
        const BucketSNSTopicBaseName: string = props.cloudtrail_tlz_logging_stack_params.BucketSNSTopicBaseName;
        this.TLZCloudtrailEnableS3SNSEventNotificationValue = props.cloudtrail_tlz_logging_stack_params.EnableS3SNSEventNotification;

        //Create or Import S3 Bucket:
        if (CreateBucket){

            this.TLZCloudTrailBucket = new s3.Bucket(this, BucketName, {
                removalPolicy: cdk.RemovalPolicy.RETAIN,
                autoDeleteObjects: false,
                versioned: false
            });

        }else{

            this.TLZCloudTrailBucket = s3.Bucket.fromBucketName(this, BucketName, BucketName);

        }

        //Create the SNS Topic or import it:
        //
        if (CreateSNSTopic){

            this.TLZCloudtrailLogsEventTopic = new sns.Topic(this, 'TLZCloudtrailLogsEventTopic', {
                topicName: BucketSNSTopicBaseName
            });

        }else{ 

            this.TLZCloudtrailLogsEventTopic = sns.Topic.fromTopicArn(this, 
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
        if (this.TLZCloudtrailEnableS3SNSEventNotificationValue){
            // EventType used should be equivalent to the configured originally at this case: 
            //  s3:ObjectCreated:*
            this.TLZCloudTrailBucket.addEventNotification(
                s3.EventType.OBJECT_CREATED,
                new s3Notifications.SnsDestination(this.TLZCloudtrailLogsEventTopic),
            );

        };

        // CloudTrail Bucket Policy to allow SNS Notifications
        //
        const CloudTrailBucketPolicyForSNSStatements = [
            new iam.PolicyStatement({
            sid: 'AllowAWSS3Notification',
            effect: iam.Effect.ALLOW,
            principals: [new iam.ServicePrincipal('s3.amazonaws.com')],
            actions: ['SNS:Publish'],
            resources: [this.TLZCloudtrailLogsEventTopic.topicArn],
            conditions: {
                'StringEquals': {
                'aws:SourceAccount': `${MainAWSAccount}`,
                },
                'ArnLike': {
                'aws:SourceArn': `${this.TLZCloudTrailBucket.bucketArn}`, //Change if non region limited required to: `arn:aws:s3:*:*:${BucketName}`,
                },
            },
            }),
        ];

        const TLZCloudtrailLogsEventTopicPolicy = new sns.TopicPolicy(this, 'TLZCloudtrailLogsEventTopicPolicy', {
            topics: [this.TLZCloudtrailLogsEventTopic],
        });

        TLZCloudtrailLogsEventTopicPolicy.document.addStatements(CloudTrailBucketPolicyForSNSStatements[0]);


        //Nested Stack OUTPUTs: - Properties in current implementation.

    } //constructor
} // NestedStack
