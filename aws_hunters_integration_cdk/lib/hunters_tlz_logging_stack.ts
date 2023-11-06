import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import { TLZLoggingStackSQSAndProductContextParamType } from './custom_types/tlz_logging_stack_custom_types';

interface HuntersTLZCoreLoggingStackProps extends cdk.StackProps {
    hunters_tlz_logging_stack_params: TLZLoggingStackSQSAndProductContextParamType;
    TLZCloudtrailLogsEventTopic: sns.ITopic;
    TLZCloudtrailS3SNSEventNotificationEnabled: boolean;
}
export class HuntersTLZCoreLoggingStack extends cdk.NestedStack {
    constructor(scope: Construct, id: string, props: HuntersTLZCoreLoggingStackProps) {
        super(scope, id, props)

        // --- HUNTERs  NESTED STACK CREATION --

        //Context Params:
        //
        const CreateSQSQueue                                : boolean = props.hunters_tlz_logging_stack_params.CreateSQSQueue;
        const QueueName                                     : string  = props.hunters_tlz_logging_stack_params.QueueName;
        const TLZCloudtrailS3SNSEventNotificationEnabled    : boolean = props.TLZCloudtrailS3SNSEventNotificationEnabled;

        //Global Passed Vars:
        let TLZCloudtrailLogsEventTopic: any = props.TLZCloudtrailLogsEventTopic;

        //Local Vars:
        //
        let HuntersCloudTrailsQueue             : any;
        let HuntersCloudTrailsQueueSubscription : any;

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
        }else{
            //WIP
        }

        //Create SQS Subscription when required for corresponding SNS Topics
        //
        if (TLZCloudtrailS3SNSEventNotificationEnabled){

            HuntersCloudTrailsQueueSubscription = new snsSubscriptions.SqsSubscription(HuntersCloudTrailsQueue, {
                rawMessageDelivery: true
            });

            TLZCloudtrailLogsEventTopic.addSubscription(HuntersCloudTrailsQueueSubscription);    
        }

    } //constructor
} //NestedStack