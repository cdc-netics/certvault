import dotenv from 'dotenv';
import fs from 'fs';
import mongoose from 'mongoose';
import path from 'path';
import { database } from '../config/database';
import { ServerPolicy } from '../models/ServerPolicy';
import { SmtpProfile } from '../models/SmtpProfile';

const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

for (let pass = 0; pass < 3; pass++) {
  let changed = false;
  for (const key in process.env) {
    const val = process.env[key];
    if (val && typeof val === 'string' && val.includes('${')) {
      const newVal = val.replace(/\${(\w+)}/g, (_, name) => process.env[name] || '');
      if (newVal !== val) {
        process.env[key] = newVal;
        changed = true;
      }
    }
  }
  if (!changed) break;
}

if (process.env.MONGODB_URI && process.env.MONGODB_URI.includes('//mongo:')) {
  process.env.MONGODB_URI = process.env.MONGODB_URI.replace('//mongo:', '//127.0.0.1:');
} else if (process.env.MONGODB_URI && process.env.MONGODB_URI.includes('//mongo/')) {
  process.env.MONGODB_URI = process.env.MONGODB_URI.replace('//mongo/', '//127.0.0.1/');
}

const asBooleanOrUndefined = (value: unknown): boolean | undefined => {
  return typeof value === 'boolean' ? value : undefined;
};

const run = async () => {
  console.log('Starting SMTP legacy policy migration...');
  await database.connect();

  try {
    const existingPolicy = await ServerPolicy.findOne();

    const activeProfileLegacy = await SmtpProfile.collection.findOne(
      { isActive: true },
      {
        projection: {
          _id: 1,
          name: 1,
          sendBackupOnDelete: 1,
          requirePersonalEmail: 1
        }
      }
    );

    const activeSendBackup = asBooleanOrUndefined(activeProfileLegacy?.sendBackupOnDelete);
    const activeRequirePersonalEmail = asBooleanOrUndefined(activeProfileLegacy?.requirePersonalEmail);

    if (!existingPolicy) {
      const created = await ServerPolicy.create({
        sendBackupOnDelete: activeSendBackup ?? true,
        requirePersonalEmail: activeRequirePersonalEmail ?? true
      });

      console.log('Created global ServerPolicy document.');
      console.log(`- sendBackupOnDelete: ${created.sendBackupOnDelete}`);
      console.log(`- requirePersonalEmail: ${created.requirePersonalEmail}`);
      if (activeProfileLegacy) {
        console.log(`- source profile: ${String(activeProfileLegacy.name || activeProfileLegacy._id)}`);
      } else {
        console.log('- source profile: none (used defaults)');
      }
    } else {
      const patch: Record<string, boolean> = {};

      if (typeof (existingPolicy as any).sendBackupOnDelete !== 'boolean' && activeSendBackup !== undefined) {
        patch.sendBackupOnDelete = activeSendBackup;
      }
      if (
        typeof (existingPolicy as any).requirePersonalEmail !== 'boolean' &&
        activeRequirePersonalEmail !== undefined
      ) {
        patch.requirePersonalEmail = activeRequirePersonalEmail;
      }

      if (Object.keys(patch).length > 0) {
        await ServerPolicy.updateOne({ _id: existingPolicy._id }, { $set: patch });
        console.log('Patched missing fields in existing ServerPolicy from active SMTP profile.');
      } else {
        console.log('ServerPolicy already exists. No seed update required.');
      }
    }

    const unsetResult = await SmtpProfile.collection.updateMany(
      {
        $or: [
          { sendBackupOnDelete: { $exists: true } },
          { requirePersonalEmail: { $exists: true } }
        ]
      },
      {
        $unset: {
          sendBackupOnDelete: '',
          requirePersonalEmail: ''
        }
      }
    );

    console.log('Legacy fields cleanup completed on smtp profiles.');
    console.log(`- matched: ${unsetResult.matchedCount}`);
    console.log(`- modified: ${unsetResult.modifiedCount}`);

    console.log('Migration finished successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
};

run();
