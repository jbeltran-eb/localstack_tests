#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MainTLZCoreLoggingStack } from '../lib/main_tlz_logging_stack';


const app = new cdk.App();
new MainTLZCoreLoggingStack(app, 'MainTLZCoreLoggingStack', {});