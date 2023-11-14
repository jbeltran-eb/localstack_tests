import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3Notifications from 'aws-cdk-lib/aws-s3-notifications';
import { Construct } from 'constructs';
import { TLZLoggingStackS3AndSNSContextParamType } from './custom_types/tlz_logging_stack_custom_types';

interface ConfigTLZCoreLoggingStackProps extends cdk.StackProps {
    config_tlz_logging_stack_params: TLZLoggingStackS3AndSNSContextParamType;
    main_aws_account: string;
    main_aws_region: string;
}

export class ConfigTLZCoreLoggingStack extends cdk.NestedStack {
    //Properties
    public TLZConfigBucket: s3.IBucket;
    public TLZConfigLogsEventTopic: sns.ITopic;
    public TLZConfigEnableS3SNSEventNotificationValue: boolean

    //Initialization of Class
    constructor(scope: Construct, id: string, props: ConfigTLZCoreLoggingStackProps) {
        super(scope, id, props)

        //Context Vars:
        console.log("Config in Nested Stack Config: %s: ", props.config_tlz_logging_stack_params)
        const CreateBucket: boolean = props.config_tlz_logging_stack_params.CreateBucket;
        const MainAWSAccount: string = props.main_aws_account;
        const MainAWSRegion: string = props.main_aws_region;
        const BucketName: string = `${props.config_tlz_logging_stack_params.BucketBaseName}-${MainAWSAccount}`;
        const CreateSNSTopic: boolean = props.config_tlz_logging_stack_params.CreateSNSTopic;
        const BucketSNSTopicBaseName: string = props.config_tlz_logging_stack_params.BucketSNSTopicBaseName;
        this.TLZConfigEnableS3SNSEventNotificationValue = props.config_tlz_logging_stack_params.EnableS3SNSEventNotification;

        //Create or Import S3 Bucket:
        if (CreateBucket){

            this.TLZConfigBucket = new s3.Bucket(this, BucketName, {
                bucketName: BucketName,
                removalPolicy: cdk.RemovalPolicy.RETAIN,
                autoDeleteObjects: false,
                versioned: false
            });

        }else{

            this.TLZConfigBucket = s3.Bucket.fromBucketName(this, BucketName, BucketName);

        }

        //Create the SNS Topic or import it:
        //
        if (CreateSNSTopic){

            this.TLZConfigLogsEventTopic = new sns.Topic(this, 'TLZConfigLogsEventTopic', {
                topicName: BucketSNSTopicBaseName
            });

            this.TLZConfigLogsEventTopic.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);

        }else{ 

            this.TLZConfigLogsEventTopic = sns.Topic.fromTopicArn(this, 
                'TLZConfigLogsEventTopic',
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
        if (this.TLZConfigEnableS3SNSEventNotificationValue){
    
            this.TLZConfigBucket.addEventNotification(
                s3.EventType.OBJECT_CREATED,
                new s3Notifications.SnsDestination(this.TLZConfigLogsEventTopic),
            );

        };

        if (CreateBucket){
            // Config Bucket Policy for the own S3 Bucket
            //
            //Investigating because differences between accounts
        }

        if (CreateSNSTopic){

            // Config Bucket Policy to allow SNS Notifications
            //
            const ConfigBucketPolicyForSNSStatements = [
                new iam.PolicyStatement({
                sid: 'AllowAWSS3Notification',
                effect: iam.Effect.ALLOW,
                principals: [new iam.ServicePrincipal('s3.amazonaws.com')],
                actions: ['SNS:Publish'],
                resources: [this.TLZConfigLogsEventTopic.topicArn],
                conditions: {
                    'StringEquals': {
                    'aws:SourceAccount': `${MainAWSAccount}`,
                    },
                    'ArnLike': {
                    'aws:SourceArn': `${this.TLZConfigBucket.bucketArn}`, //Change if non region limited required to: `arn:aws:s3:*:*:${BucketName}`,
                    },
                },
                }),
            ];

            const TLZConfigLogsEventTopicPolicy = new sns.TopicPolicy(this, 'TLZConfigLogsEventTopicPolicy', {
                topics: [this.TLZConfigLogsEventTopic],
            });

            TLZConfigLogsEventTopicPolicy.document.addStatements(ConfigBucketPolicyForSNSStatements[0]);

            TLZConfigLogsEventTopicPolicy.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);
        }

        //Nested Stack OUTPUTs: - Properties in current implementation.

    } //constructor
} // NestedStack
