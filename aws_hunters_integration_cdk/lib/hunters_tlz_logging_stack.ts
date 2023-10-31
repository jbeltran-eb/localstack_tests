import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { custom_context_param_stack_type } from '../lib/custom_types/custom_types'

interface HuntersTLZCoreLoggingStackProps extends cdk.StackProps {
    custom_user_stack_params: custom_context_param_stack_type;
}
export class HuntersTLZCoreLoggingStack extends cdk.NestedStack {
    constructor(scope: Construct, id: string, props: HuntersTLZCoreLoggingStackProps) {
        super(scope, id, props)

        // --- HUNTERs  NESTED STACK CREATION --

        //Flag Status Reported from Config
        //
        console.log('-- [%s] CONFIGURATION FLAGs RECEIVED FROM MAIN STACK --',HuntersTLZCoreLoggingStack.name);
        console.log('Create List of S3 Buckets: %s', props.custom_user_stack_params.CreateListOfS3Buckets);
        console.log('--- END ---')

    } //constructor
} //NestedStack