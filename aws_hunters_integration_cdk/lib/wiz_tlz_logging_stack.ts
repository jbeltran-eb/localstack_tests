import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { custom_context_param_stack_type } from '../lib/custom_types/custom_types'

interface WizTLZCoreLoggingStackProps extends cdk.StackProps {
    custom_user_stack_params: custom_context_param_stack_type;
}
export class WizTLZCoreLoggingStack extends cdk.NestedStack {
    constructor(scope: Construct, id: string, props: WizTLZCoreLoggingStackProps) {
        super(scope, id, props)

        // --- WIZ  NESTED STACK CREATION --

        //Flag Status Reported from Config
        //
        console.log('-- [%s] CONFIGURATION FLAGs RECEIVED FROM MAIN STACK --', WizTLZCoreLoggingStack.name);
        console.log('Create List of S3 Buckets: %s', props.custom_user_stack_params.CreateListOfS3Buckets);
        console.log('--- END ---')

        //Context Params:
        //
        const CreateSQSQueues: boolean = props.custom_user_stack_params.CreateSQSQueues

        // Global Vars
        //
        let WizCloudTrailsQueue: any;
        let WizCloudTrailsQueueSubscription: any;

        //Create the SQS Queues:
        //
        if (CreateSQSQueues){

            WizCloudTrailsQueue = new sqs.Queue(
                this, 
                'WizCloudTrailQueue', 
                {
                    queueName: 'wiz-cloudtrail-logs-queue',
                    //visibilityTimeout: Duration.days(4),
                }
            );
        }

    } //constructor
} //NestedStack