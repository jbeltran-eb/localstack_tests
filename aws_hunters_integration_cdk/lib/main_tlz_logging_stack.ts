import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Notifications from 'aws-cdk-lib/aws-s3-notifications';
import { TLZLoggingStackContextParamType } from './custom_types/tlz_logging_stack_custom_types'
import { TLZLoggingStackContextCloudtrailParamType } from './custom_types/tlz_logging_stack_custom_types'
import { TLZLoggingStackContextHuntersParamType } from './custom_types/tlz_logging_stack_custom_types'
import { TLZLoggingStackContextWizParamType } from './custom_types/tlz_logging_stack_custom_types'
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
    console.log('Type: %s', typeof contextParams)
    console.log('Type custom_tlz_logging_stack_params: %s', typeof contextParams['custom_tlz_logging_stack_params']);
    console.log(contextParams);
    console.log('---')


    // --- CREATING NESTED STACKs ---
    //

    //Dynamic Global Vars:
    let TLZCloudtrailLogsEventTopic: any;

    //CLOUDTRAIL:
    new CloudtrailTLZCoreLoggingStack(this,
      'CloudtrailTLZCoreLoggingStack',
      {
        cloudtrail_tlz_logging_stack_params: contextParams['custom_tlz_logging_stack_params'].CloudTrail as TLZLoggingStackContextCloudtrailParamType,
        main_aws_account: contextParams['custom_tlz_logging_stack_params'].MainAWSAccount as string,
        main_aws_region: contextParams['custom_tlz_logging_stack_params'].MainAWSRegion as string,
        tlz_cloudtrail_logs_event_topic: TLZCloudtrailLogsEventTopic

      }
    );

    //HUNTERs:
    new HuntersTLZCoreLoggingStack(this,
      'HuntersTLZCoreLoggingStack', 
      { 
        hunters_tlz_logging_stack_params: contextParams['custom_tlz_logging_stack_params'].Hunters as TLZLoggingStackContextHuntersParamType,
        TLZCloudtrailLogsEventTopic,
        TLZCloudtrailS3SNSEventNotificationEnabled: contextParams['custom_tlz_logging_stack_params'].CloudTrail.EnableS3SNSEventNotification as boolean
      }
    );

    //WIZ:
    new WizTLZCoreLoggingStack(this,
      'WizTLZCoreLoggingStack',
      { 
        wiz_tlz_logging_stack_params: contextParams['custom_tlz_logging_stack_params.Wiz'].Wiz as TLZLoggingStackContextWizParamType,
        TLZCloudtrailLogsEventTopic,
        TLZCloudtrailS3SNSEventNotificationEnabled: contextParams['custom_tlz_logging_stack_params'].CloudTrail.EnableS3SNSEventNotification as boolean
      }
    );

  } //constructor
} // main class
