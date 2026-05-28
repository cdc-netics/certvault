import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const BSON = mongoose.mongo.BSON;

const testBson = () => {
  const filePath = path.join(__dirname, '../../../BAK/extracted/tmp/dump/certiapp/brandingsettings.bson');
  if (!fs.existsSync(filePath)) {
    console.error('El archivo no existe:', filePath);
    return;
  }

  const buffer = fs.readFileSync(filePath);
  const documents: any[] = [];
  let offset = 0;

  try {
    while (offset < buffer.length) {
      const size = buffer.readInt32LE(offset);
      if (offset + size > buffer.length) {
        throw new Error('BSON buffer overflow o corrupto');
      }
      const docBuffer = buffer.subarray(offset, offset + size);
      const doc = BSON.deserialize(docBuffer);
      documents.push(doc);
      offset += size;
    }
    console.log('Documentos deserializados con éxito:', documents);
  } catch (error) {
    console.error('Error al deserializar BSON:', error);
  }
};

testBson();
