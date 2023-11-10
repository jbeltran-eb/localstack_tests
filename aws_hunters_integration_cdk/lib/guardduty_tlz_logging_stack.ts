import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3Notifications from 'aws-cdk-lib/aws-s3-notifications';
import { Construct } from 'constructs';
import { TLZLoggingStackS3AndSNSContextParamType } from './custom_types/tlz_logging_stack_custom_types';

interface GuardDutyTLZCoreLoggingStackProps extends cdk.StackProps {
    guardduty_tlz_logging_stack_params: TLZLoggingStackS3AndSNSContextParamType;
    main_aws_account: string;
    main_aws_region: string;
}

export class GuardDutyTLZCoreLoggingStack extends cdk.NestedStack {
    //Properties
    public TLZGuardDutyBucket: s3.IBucket;
    public TLZGuardDutyLogsEventTopic: sns.ITopic;
    public TLZGuardDutyEnableS3SNSEventNotificationValue: boolean

    //Initialization of Class
    constructor(scope: Construct, id: string, props: GuardDutyTLZCoreLoggingStackProps) {
        super(scope, id, props)

        //Context Vars:
        console.log("GuardDuty in Nested Stack GuardDuty: %s: ", props.guardduty_tlz_logging_stack_params)
        const CreateBucket: boolean = props.guardduty_tlz_logging_stack_params.CreateBucket;
        const MainAWSAccount: string = props.main_aws_account;
        const MainAWSRegion: string = props.main_aws_region;
        const BucketName: string = `${props.guardduty_tlz_logging_stack_params.BucketBaseName}-${MainAWSAccount}`;
        const CreateSNSTopic: boolean = props.guardduty_tlz_logging_stack_params.CreateSNSTopic;
        const BucketSNSTopicBaseName: string = props.guardduty_tlz_logging_stack_params.BucketSNSTopicBaseName;
        this.TLZGuardDutyEnableS3SNSEventNotificationValue = props.guardduty_tlz_logging_stack_params.EnableS3SNSEventNotification;

        //Create or Import S3 Bucket:
        if (CreateBucket){

            this.TLZGuardDutyBucket = new s3.Bucket(this, BucketName, {
                removalPolicy: cdk.RemovalPolicy.RETAIN,
                autoDeleteObjects: false,
                versioned: false
            });

        }else{

            this.TLZGuardDutyBucket = s3.Bucket.fromBucketName(this, BucketName, BucketName);

        }

        //Create the SNS Topic or import it:
        //
        if (CreateSNSTopic){

            this.TLZGuardDutyLogsEventTopic = new sns.Topic(this, 'TLZGuardDutyLogsEventTopic', {
                topicName: BucketSNSTopicBaseName
            });

        }else{ 

            this.TLZGuardDutyLogsEventTopic = sns.Topic.fromTopicArn(this, 
                'TLZGuardDutyLogsEventTopic',
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
        if (this.TLZGuardDutyEnableS3SNSEventNotificationValue){
    
            this.TLZGuardDutyBucket.addEventNotification(
                s3.EventType.OBJECT_CREATED,
                new s3Notifications.SnsDestination(this.TLZGuardDutyLogsEventTopic),
            );

        };

        if (CreateSNSTopic){

            // GuardDuty Bucket Policy to allow SNS Notifications
            //
            const GuardDutyBucketPolicyForSNSStatements = [
                new iam.PolicyStatement({
                sid: 'AllowAWSS3Notification',
                effect: iam.Effect.ALLOW,
                principals: [new iam.ServicePrincipal('s3.amazonaws.com')],
                actions: ['SNS:Publish'],
                resources: [this.TLZGuardDutyLogsEventTopic.topicArn],
                conditions: {
                    'StringEquals': {
                    'aws:SourceAccount': `${MainAWSAccount}`,
                    },
                    'ArnLike': {
                    'aws:SourceArn': `${this.TLZGuardDutyBucket.bucketArn}`, //Change if non region limited required to: `arn:aws:s3:*:*:${BucketName}`,
                    },
                },
                }),
            ];

            const TLZGuardDutyLogsEventTopicPolicy = new sns.TopicPolicy(this, 'TLZGuardDutyLogsEventTopicPolicy', {
                topics: [this.TLZGuardDutyLogsEventTopic],
            });

            TLZGuardDutyLogsEventTopicPolicy.document.addStatements(GuardDutyBucketPolicyForSNSStatements[0]);
        }

        //Nested Stack OUTPUTs: - Properties in current implementation.

    } //constructor
} // NestedStack
