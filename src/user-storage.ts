import fs from 'fs/promises';
import path from 'path';
import { safeStorage } from 'electron';
import { KeytarService } from './keytar';

export type UserData = {
  id: string;
  name: string;
  password: string;
};

class UserStorage {

  private readonly keytarService = new KeytarService();
  constructor(private readonly path: string) {}

  private getFileName(id: string): string {
    return path.join(this.path, `${id}.json`);
  }

  async migrateFromKeytarToElectronStorage(): Promise<void> {
    // Read all the passwords from keytar.
    // Can include legacy passwords that were saved in the app.
    const passwords = await this.keytarService.loadAll();
    if (Object.keys(passwords).length === 0) {
      console.log('No passwords found in keytar');
      return;
    }

    console.log(`Found ${Object.keys(passwords).length} passwords in keytar`);
    
    // Read all the users from the users folder.
    const data = await fs.readdir(this.path);
    const users = (await Promise.all(
      data
        .map(x => x.replace('.json', ''))
        .map((id) => fs.readFile(this.getFileName(id)))
    )).map(x => JSON.parse(x.toString()));

    if (users.length === 0) {
      console.log('No users found in the users folder');
      return;
    }

    console.log(`Found ${users.length} users in the users folder`);

    // Merge the two lists based on users.id.
    const merged = users
      .filter(x => !x.password)
      .map(user => ({
        ...user,
        password: passwords[user.id],
      })
    );

    if (merged.length === 0) {
      console.log('No users to migrate');
      return;
    }

    console.log(`Merged ${merged.length} users`);

    // Save the merged list.
    await Promise.all(merged.map(this.save.bind(this)));
    console.log('Migrated from keytar to electron-store');

    // Delete all the passwords from keytar.
    await Promise.all(Object.keys(passwords).map(this.keytarService.delete.bind(this.keytarService)));
    console.log('Deleted all passwords from keytar');
  }

  async loadAll(): Promise<UserData[]> {
    const data = await fs.readdir(this.path);
    return Promise.all(data.map(x => x.replace('.json', '')).map(this.loadOne.bind(this)));
  }

  async loadOne(id: string): Promise<UserData> {
    const data = (await fs.readFile(this.getFileName(id))).toString();
    const user = JSON.parse(data);
    user.password = safeStorage.decryptString(Buffer.from(user.password, 'base64'));
    return user;
  }

  async save(user: UserData): Promise<void> {
    user.password = safeStorage.encryptString(user.password).toString('base64');
    await fs.writeFile(this.getFileName(user.id), JSON.stringify(user, null, 2));
  }

  async delete(id: string): Promise<void> {
    void fs.unlink(this.getFileName(id));
  }
};

export async function setupStorage () {
  const dir = path.join(process.cwd(), 'users');
  await fs.mkdir(dir, { recursive: true });
  const userStorage = new UserStorage(dir);
  return userStorage;
};