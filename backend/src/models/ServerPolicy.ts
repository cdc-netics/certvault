import { Schema, model, Document } from 'mongoose';

export interface IServerPolicy extends Document {
	sendBackupOnDelete: boolean;
	requirePersonalEmail: boolean;
	updatedBy?: Schema.Types.ObjectId;
	createdAt: Date;
	updatedAt: Date;
}

const serverPolicySchema = new Schema<IServerPolicy>(
	{
		sendBackupOnDelete: {
			type: Boolean,
			default: true
		},
		requirePersonalEmail: {
			type: Boolean,
			default: true
		},
		updatedBy: {
			type: Schema.Types.ObjectId,
			ref: 'User'
		}
	},
	{
		timestamps: true
	}
);

export const ServerPolicy = model<IServerPolicy>('ServerPolicy', serverPolicySchema);
