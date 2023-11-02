import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import { TLZLoggingStackContextWizParamType } from './custom_types/tlz_logging_stack_custom_types'

interface WizTLZCoreLoggingStackProps extends cdk.StackProps {
    wiz_tlz_logging_stack_params: TLZLoggingStackContextWizParamType;
    TLZCloudtrailLogsEventTopic: sns.ITopic;
    TLZCloudtrailS3SNSEventNotificationEnabled: boolean;
}
export class WizTLZCoreLoggingStack extends cdk.NestedStack {
    constructor(scope: Construct, id: string, props: WizTLZCoreLoggingStackProps) {
        super(scope, id, props)

        // --- WIZ  NESTED STACK CREATION --

        //Context Params:
        //
        const CreateSQSQueue                               : boolean = props.wiz_tlz_logging_stack_params.Wiz.CreateSQSQueue;
        const QueueName                                    : string  = props.wiz_tlz_logging_stack_params.Wiz.QueueName;
        const TLZCloudtrailS3SNSEventNotificationEnabled   : boolean = props.TLZCloudtrailS3SNSEventNotificationEnabled;

        //Global Passed Vars:
        let TLZCloudtrailLogsEventTopic: any = props.TLZCloudtrailLogsEventTopic;

        // Local Vars
        //
        let WizCloudTrailsQueue             : any;
        let WizCloudTrailsQueueSubscription : any;

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
            //WIP
        }

        //Create SQS Subscription when required for corresponding SNS Topics
        //
        if (TLZCloudtrailS3SNSEventNotificationEnabled){

            WizCloudTrailsQueueSubscription = new snsSubscriptions.SqsSubscription(WizCloudTrailsQueue, {
                rawMessageDelivery: true
            });

            TLZCloudtrailLogsEventTopic.addSubscription(WizCloudTrailsQueueSubscription);
        }

    } //constructor
} //NestedStack