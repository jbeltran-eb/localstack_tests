import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import { TLZLoggingStackSQSAndProductContextParamType } from './custom_types/tlz_logging_stack_custom_types';

interface WizTLZCoreLoggingStackProps extends cdk.StackProps {
    wiz_tlz_logging_stack_params: TLZLoggingStackSQSAndProductContextParamType;
    TLZCloudtrailLogsEventTopic: sns.ITopic;
    TLZCloudtrailS3SNSEventNotificationEnabled: boolean;
    TLZCloudTrailBucketName: string;
}
export class WizTLZCoreLoggingStack extends cdk.NestedStack {
    constructor(scope: Construct, id: string, props: WizTLZCoreLoggingStackProps) {
        super(scope, id, props)

        // --- WIZ  NESTED STACK CREATION --

        //Context Params:
        //
        const CreateSQSQueue                               : boolean = props.wiz_tlz_logging_stack_params.CreateSQSQueue;
        const QueueName                                    : string  = props.wiz_tlz_logging_stack_params.QueueName;
        const QueueARN                                     : string  = props.wiz_tlz_logging_stack_params.QueueARN;
        const TLZCloudtrailS3SNSEventNotificationEnabled   : boolean = props.TLZCloudtrailS3SNSEventNotificationEnabled;
        const CloudTrailBucketName                         : string  = props.TLZCloudTrailBucketName;
        const WizAccountId                                 : string  = props.wiz_tlz_logging_stack_params.AccountId;
        const WizExternalId                                : string  = props.wiz_tlz_logging_stack_params.ExternalId;
        const WizRoleName                                  : string  = props.wiz_tlz_logging_stack_params.RoleName;
        const WizKmsArns                                   : string  = props.wiz_tlz_logging_stack_params.KmsArns;
        const WizCloudTrailBucketAccessIamPolicyName       : string  = props.wiz_tlz_logging_stack_params.CloudTrailBucketAccessIamPolicyName;

        //Global Passed Vars:
        let TLZCloudtrailLogsEventTopic: any = props.TLZCloudtrailLogsEventTopic;

        // Local Vars
        //
        let WizCloudTrailsQueue             : sqs.IQueue;
        let WizCloudTrailsQueueSubscription : snsSubscriptions.SqsSubscription;

        //Flag Status Reported from Config
        //
        console.log('-- [%s] CONFIGURATION FLAGs RECEIVED FROM MAIN STACK --', WizTLZCoreLoggingStack.name);
        console.log('Create SQS Queue: %s', CreateSQSQueue);
        console.log('Name for the AWS SQS Queue: %s', QueueName);
        console.log('--- END ---')

        //Create the SQS Queues:
        //
        if (CreateSQSQueue){

            WizCloudTrailsQueue = new sqs.Queue(
                this, 
                'WizCloudTrailQueue', 
                {
                    queueName: QueueName,
                    //visibilityTimeout: Duration.days(4),
                }
            );
        }else{
            
            WizCloudTrailsQueue = sqs.Queue.fromQueueArn(this, QueueName, QueueARN);

        }

        //Create SQS Subscription when required for corresponding SNS Topics
        //
        if (TLZCloudtrailS3SNSEventNotificationEnabled){

            WizCloudTrailsQueueSubscription = new snsSubscriptions.SqsSubscription(WizCloudTrailsQueue, {
                rawMessageDelivery: true
            });

            TLZCloudtrailLogsEventTopic.addSubscription(WizCloudTrailsQueueSubscription);
        }

        //Create Wiz's IAM Role, Policies and their statements:
        //
        const WizAccessIamRole = new iam.Role(this,'WizAccessIamRole',{
            assumedBy: new iam.AccountPrincipal(WizAccountId),
            externalIds: [WizExternalId],
            roleName: WizRoleName,
        });

        const WizCloudTrailBucketAccessPolicyStatements = [
            new iam.PolicyStatement({
                sid: 'AllowWizAccessCloudtrailS3ListGetLocation',
                effect: iam.Effect.ALLOW,
                actions: [
                    's3:GetBucketLocation',
                    's3:ListBucket'
                ],
                resources: [`arn:aws:s3:::${CloudTrailBucketName}`],
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
                resources: [`arn:aws:s3:::${CloudTrailBucketName}/*`],
                conditions: {
                    'Bool': {
                    'aws:SecureTransport': 'true'
                    }
                }
            }),
        ];

        const WizCloudTrailBucketAccessIamPolicy = new iam.Policy(this, 'WizCloudTrailBucketAccessIamPolicy', {
            statements: WizCloudTrailBucketAccessPolicyStatements,
            policyName: WizCloudTrailBucketAccessIamPolicyName
        });

        WizCloudTrailBucketAccessIamPolicy.attachToRole(WizAccessIamRole);

              // CloudTrail SNS Policy: SQS Notify for Wiz
        const CloudTrailSNSPolicyForSQSWizStatements = [
            new iam.PolicyStatement({
                sid: 'Allow-SNS-SendMessage',
                effect: iam.Effect.ALLOW,
                principals: [new iam.ServicePrincipal('sns.amazonaws.com')],
                actions: ['sqs:SendMessage'],
                resources: [WizCloudTrailsQueue.queueArn],
                conditions: {
                    ArnEquals: {
                    'aws:SourceArn': TLZCloudtrailLogsEventTopic.topicArn,
                    },
                },
            }),
            new iam.PolicyStatement({
                sid: 'Allow-WizAccess-RecvDeleteMsg',
                effect: iam.Effect.ALLOW,
                principals: [new iam.ArnPrincipal(WizAccessIamRole.roleArn)],
                actions: ['sqs:DeleteMessage', 'sqs:ReceiveMessage'],
                resources: [WizCloudTrailsQueue.queueArn],
            }),
        ]

        const CloudTrailSNSPolicyForSQSWiz = new sqs.QueuePolicy(this, 'CloudTrailSNSPolicyForSQSWiz', {
            queues: [WizCloudTrailsQueue],
        });
    
        CloudTrailSNSPolicyForSQSWiz.document.addStatements(
            CloudTrailSNSPolicyForSQSWizStatements[0],
            CloudTrailSNSPolicyForSQSWizStatements[1]
        );

    } //constructor
} //NestedStack