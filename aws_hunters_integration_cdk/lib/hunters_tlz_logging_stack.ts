import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import { TLZLoggingStackSQSAndProductContextParamType } from './custom_types/tlz_logging_stack_custom_types';

interface HuntersTLZCoreLoggingStackProps extends cdk.StackProps {
    hunters_tlz_logging_stack_params: TLZLoggingStackSQSAndProductContextParamType;
    TLZCloudtrailLogsEventTopic: sns.ITopic;
    TLZCloudtrailS3SNSEventNotificationEnabled: boolean;
    TLZCloudTrailBucketName: string;
}
export class HuntersTLZCoreLoggingStack extends cdk.NestedStack {
    constructor(scope: Construct, id: string, props: HuntersTLZCoreLoggingStackProps) {
        super(scope, id, props)

        // --- HUNTERs  NESTED STACK CREATION --

        //Context Params:
        //
        const CreateSQSQueue                                : boolean = props.hunters_tlz_logging_stack_params.CreateSQSQueue;
        const QueueName                                     : string  = props.hunters_tlz_logging_stack_params.QueueName;
        const QueueARN                                      : string  = props.hunters_tlz_logging_stack_params.QueueARN;
        const TLZCloudtrailS3SNSEventNotificationEnabled    : boolean = props.TLZCloudtrailS3SNSEventNotificationEnabled;
        const CloudTrailBucketName                          : string  = props.TLZCloudTrailBucketName;
        const HuntersAccountId                              : string  = props.hunters_tlz_logging_stack_params.AccountId;
        const HuntersExternalId                             : string  = props.hunters_tlz_logging_stack_params.ExternalId;
        const HuntersRoleName                               : string  = props.hunters_tlz_logging_stack_params.RoleName;
        const HuntersKmsArns                                : string  = props.hunters_tlz_logging_stack_params.KmsArns;
        const HuntersCloudTrailBucketAccessIamPolicyName    : string  = props.hunters_tlz_logging_stack_params.CloudTrailBucketAccessIamPolicyName;

        //Global Passed Vars:
        let TLZCloudtrailLogsEventTopic: any = props.TLZCloudtrailLogsEventTopic;

        //Local Vars:
        //
        let HuntersCloudTrailsQueue             : sqs.IQueue;
        let HuntersCloudTrailsQueueSubscription : snsSubscriptions.SqsSubscription;

        //Flag Status Reported from Config
        //
        console.log('-- [%s] CONFIGURATION FLAGs RECEIVED FROM MAIN STACK --', HuntersTLZCoreLoggingStack.name);
        console.log('Create SQS Queue: %s', CreateSQSQueue);
        console.log('Name for the AWS SQS Queue: %s', QueueName);
        console.log('--- END ---')

        //Create the SQS Queues or Import it:
        //
        if (CreateSQSQueue){
            HuntersCloudTrailsQueue = new sqs.Queue(
                this, 
                'HuntersCloudTrailQueue', 
                {
                    queueName: QueueName,
                    //visibilityTimeout: Duration.days(4),
                }
            );

            HuntersCloudTrailsQueue.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);

        }else{
            HuntersCloudTrailsQueue = sqs.Queue.fromQueueArn(this, QueueName, QueueARN);
        }

        //Create SQS Subscription when required for corresponding SNS Topics
        //
        if (TLZCloudtrailS3SNSEventNotificationEnabled){

            HuntersCloudTrailsQueueSubscription = new snsSubscriptions.SqsSubscription(HuntersCloudTrailsQueue, {
                rawMessageDelivery: true
            });

            TLZCloudtrailLogsEventTopic.addSubscription(HuntersCloudTrailsQueueSubscription);    

        }

        //Create Hunters's IAM Role, Policies and their statements:
        //
        const HuntersIamRole = new iam.Role(this, 'HuntersIamRole', {
            assumedBy: new iam.AccountPrincipal(HuntersAccountId),
            externalIds: [HuntersExternalId],
            roleName: HuntersRoleName,
        });

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

        HuntersCloudTrailBucketAccessIamPolicy.attachToRole(HuntersIamRole);

        HuntersCloudTrailBucketAccessIamPolicy.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);

        HuntersIamRole.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);

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
    
        CloudTrailSNSPolicyForSQSHunters.document.addStatements(
            CloudTrailSNSPolicyForSQSHunterStatements[0],
            CloudTrailSNSPolicyForSQSHunterStatements[1]
        );

        CloudTrailSNSPolicyForSQSHunters.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);

    } //constructor
} //NestedStack