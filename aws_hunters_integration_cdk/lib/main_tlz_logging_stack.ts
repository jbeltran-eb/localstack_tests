import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as fs from 'fs';
import { TLZLoggingCreatingStacksContextParamType } from './custom_types/tlz_logging_stack_custom_types';
import { TLZLoggingStackS3AndSNSContextParamType } from './custom_types/tlz_logging_stack_custom_types';
import { TLZLoggingStackSQSAndProductContextParamType } from './custom_types/tlz_logging_stack_custom_types';
import { GuardDutyTLZCoreLoggingStack } from '../lib/guardduty_tlz_logging_stack'
import { VPCFlowLogsTLZCoreLoggingStack } from '../lib/vpcflowlogs_tlz_logging_stack'
import { ConfigTLZCoreLoggingStack } from '../lib/config_tlz_logging_stack';
import { CloudtrailTLZCoreLoggingStack } from '../lib/cloudtrail_tlz_logging_stack';
import { HuntersTLZCoreLoggingStack } from '../lib/hunters_tlz_logging_stack';
import { WizTLZCoreLoggingStack } from '../lib/wiz_tlz_logging_stack';

export class MainTLZCoreLoggingStack extends cdk.Stack {
  VPCFlowLogsNestedStack: VPCFlowLogsTLZCoreLoggingStack
  GuardDutyNestedStack: GuardDutyTLZCoreLoggingStack
  ConfigNestedStack: ConfigTLZCoreLoggingStack
  CloudTrailNestedStack: CloudtrailTLZCoreLoggingStack
  HuntersNestedStack: cdk.NestedStack
  WizNestedStack: cdk.NestedStack

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
    const CreateStacks   : TLZLoggingCreatingStacksContextParamType = contextParams['custom_tlz_logging_stack_params'].CreateStacks;

    //Dynamic Global Vars:
    let VPCFlowLogsConfig    : TLZLoggingStackS3AndSNSContextParamType      = contextParams['custom_tlz_logging_stack_params'].VPCFlowLogs;
    let GuardDutyConfig      : TLZLoggingStackS3AndSNSContextParamType      = contextParams['custom_tlz_logging_stack_params'].GuardDuty;
    let ConfigParamsConfig   : TLZLoggingStackS3AndSNSContextParamType      = contextParams['custom_tlz_logging_stack_params'].Config;
    let CloudTrailConfig     : TLZLoggingStackS3AndSNSContextParamType      = contextParams['custom_tlz_logging_stack_params'].CloudTrail;
    let HuntersConfig        : TLZLoggingStackSQSAndProductContextParamType = contextParams['custom_tlz_logging_stack_params'].Hunters;
    let WizConfig            : TLZLoggingStackSQSAndProductContextParamType = contextParams['custom_tlz_logging_stack_params'].Wiz;

    console.log("Extracted the next VPC Flow Logs Config From context: %s", VPCFlowLogsConfig);   
    console.log("Extracted the next Guard Duty Config From context: %s", GuardDutyConfig);   
    console.log("Extracted the next AWS Config params From context: %s", ConfigParamsConfig);
    console.log("Extracted the next CloudTrail Config From context: %s", CloudTrailConfig);
    console.log("Extracted the next Hunters Config from context: %s", HuntersConfig);
    console.log("Extracted the next Wiz Config from context: %s", WizConfig);

    if (CreateStacks.VPCFlowLogs){
      //VPC FLOW LOGs:
      this.VPCFlowLogsNestedStack = new VPCFlowLogsTLZCoreLoggingStack(this,
        'VPCFlowLogsTLZCoreLoggingStack',
        {
          vpcflowlogs_tlz_logging_stack_params: VPCFlowLogsConfig, 
          main_aws_account: MainAWSAccount,
          main_aws_region: MainAWSRegion,

        }
      );

      this.VPCFlowLogsNestedStack.terminationProtection = CreateStacks.VPCFlowLogsTerminationProtection;

    }

    if (CreateStacks.GuardDuty){
      //GUARD DUTY:
      this.GuardDutyNestedStack = new GuardDutyTLZCoreLoggingStack(this,
        'GuardDutyTLZCoreLoggingStack',
        {
          guardduty_tlz_logging_stack_params: GuardDutyConfig, 
          main_aws_account: MainAWSAccount,
          main_aws_region: MainAWSRegion,

        }
      );

      this.GuardDutyNestedStack.terminationProtection = CreateStacks.GuardDutyTerminationProtection;

    }

    if (CreateStacks.Config){
      //CONFIG:
      this.ConfigNestedStack = new ConfigTLZCoreLoggingStack(this,
        'ConfigTLZCoreLoggingStack',
        {
          config_tlz_logging_stack_params: ConfigParamsConfig, 
          main_aws_account: MainAWSAccount,
          main_aws_region: MainAWSRegion,

        }
      );

      this.ConfigNestedStack.terminationProtection = CreateStacks.ConfigTerminationProtection;

    }

    if (CreateStacks.CloudTrail){
      //CLOUDTRAIL:
      this.CloudTrailNestedStack = new CloudtrailTLZCoreLoggingStack(this,
        'CloudtrailTLZCoreLoggingStack',
        {
          cloudtrail_tlz_logging_stack_params: CloudTrailConfig, 
          main_aws_account: MainAWSAccount,
          main_aws_region: MainAWSRegion,

        }
      );

      this.CloudTrailNestedStack.terminationProtection = CreateStacks.CloudTrailTerminationProtection;
    
      if (CreateStacks.Hunters){
        //HUNTERs:
        this.HuntersNestedStack = new HuntersTLZCoreLoggingStack(this,
          'HuntersTLZCoreLoggingStack', 
          { 
            hunters_tlz_logging_stack_params: HuntersConfig,
            TLZCloudtrailLogsEventTopic: this.CloudTrailNestedStack.TLZCloudtrailLogsEventTopic,
            TLZCloudtrailS3SNSEventNotificationEnabled: this.CloudTrailNestedStack.TLZCloudtrailEnableS3SNSEventNotificationValue,
            TLZCloudTrailBucketName: this.CloudTrailNestedStack.TLZCloudTrailBucket.bucketName
          }
        );

        this.HuntersNestedStack.terminationProtection = CreateStacks.HuntersTerminationProtection;
      }

      if (CreateStacks.Wiz){
        // //WIZ:
        this.WizNestedStack = new WizTLZCoreLoggingStack(this,
          'WizTLZCoreLoggingStack',
          { 
            wiz_tlz_logging_stack_params: WizConfig,
            TLZCloudtrailLogsEventTopic: this.CloudTrailNestedStack.TLZCloudtrailLogsEventTopic,
            TLZCloudtrailS3SNSEventNotificationEnabled: this.CloudTrailNestedStack.TLZCloudtrailEnableS3SNSEventNotificationValue,
            TLZCloudTrailBucketName: this.CloudTrailNestedStack.TLZCloudTrailBucket.bucketName
          }
        );

        this.WizNestedStack.terminationProtection = CreateStacks.WizTerminationProtection;
      }

    }

  } //constructor
} // main class
