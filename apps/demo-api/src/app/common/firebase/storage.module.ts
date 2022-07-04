import { firebaseServerStorageModuleMetadata } from '@dereekb/firebase-server';
import { Module } from '@nestjs/common';

@Module(firebaseServerStorageModuleMetadata())
export class DemoApiStorageModule {}
