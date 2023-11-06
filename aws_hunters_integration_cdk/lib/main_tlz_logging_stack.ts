import * as cdk from 'aws-cdk-lib';
import { TLZLoggingStackS3AndSNSContextParamType } from './custom_types/tlz_logging_stack_custom_types';
import { TLZLoggingStackSQSAndProductContextParamType } from './custom_types/tlz_logging_stack_custom_types';
import * as fs from 'fs';
import { CloudtrailTLZCoreLoggingStack } from '../lib/cloudtrail_tlz_logging_stack';
import { HuntersTLZCoreLoggingStack } from '../lib/hunters_tlz_logging_stack';
import { WizTLZCoreLoggingStack } from '../lib/wiz_tlz_logging_stack';
import { Construct } from 'constructs';

export class MainTLZCoreLoggingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //Context Variables/Constants:

    //Get Context Variables:
    const cdkConfig = JSON.parse(fs.readFileSync('cdk.json', 'utf8'));
    const contextParams = cdkConfig.context;
    console.log('--- GETTING CONTEXT VARIABLES FROM cdk.json ---')
    console.log('Type custom_tlz_logging_stack_params: %s', typeof contextParams['custom_tlz_logging_stack_params']);
    console.log(contextParams);
    console.log('---')


    // --- CREATING NESTED STACKs ---
    //

    // Context Params:
    const MainAWSAccount : string = contextParams['custom_tlz_logging_stack_params'].MainAWSAccount;
    const MainAWSRegion  : string = contextParams['custom_tlz_logging_stack_params'].MainAWSRegion;

    //Dynamic Global Vars:
    let CloudTrailConfig     : TLZLoggingStackS3AndSNSContextParamType      = contextParams['custom_tlz_logging_stack_params'].CloudTrail;
    let HuntersConfig        : TLZLoggingStackSQSAndProductContextParamType = contextParams['custom_tlz_logging_stack_params'].Hunters;
    let WizConfig            : TLZLoggingStackSQSAndProductContextParamType = contextParams['custom_tlz_logging_stack_params'].Wiz;

    console.log("Extracted the next CloudTrail Config From context: %s", CloudTrailConfig);
    console.log("Extracted the next Hunters Config from context: %s", HuntersConfig);
    console.log("Extracted the next Hunters Config from context: %s", WizConfig);

    let CloudTrailNestedStack : any;
    let HuntersNestedStack    : any;
    let WizNestedStack        : any;

    //CLOUDTRAIL:
    CloudTrailNestedStack = new CloudtrailTLZCoreLoggingStack(this,
      'CloudtrailTLZCoreLoggingStack',
      {
        cloudtrail_tlz_logging_stack_params: CloudTrailConfig, 
        main_aws_account: MainAWSAccount,
        main_aws_region: MainAWSRegion,

      }
    );

    //HUNTERs:
    HuntersNestedStack = new HuntersTLZCoreLoggingStack(this,
      'HuntersTLZCoreLoggingStack', 
      { 
        hunters_tlz_logging_stack_params: HuntersConfig,
        TLZCloudtrailLogsEventTopic: CloudTrailNestedStack.TLZCloudtrailLogsEventTopic,
        TLZCloudtrailS3SNSEventNotificationEnabled: CloudTrailNestedStack.EnableS3SNSEventNotification
      }
    );

    // //WIZ:
    WizNestedStack = new WizTLZCoreLoggingStack(this,
      'WizTLZCoreLoggingStack',
      { 
        wiz_tlz_logging_stack_params: WizConfig,
        TLZCloudtrailLogsEventTopic: CloudTrailNestedStack.TLZCloudtrailLogsEventTopic,
        TLZCloudtrailS3SNSEventNotificationEnabled: CloudTrailNestedStack.EnableS3SNSEventNotification
      }
    );

  } //constructor
} // main class
