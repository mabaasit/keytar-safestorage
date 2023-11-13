import fs from 'fs/promises';
import path from 'path';
import electron from 'electron';
import { KeytarService } from './keytar';

export type UserData = {
  id: string;
  name: string;
  password: string;
  version?: number;
};

class UserStorage {

  private readonly keytarService = new KeytarService();
  constructor(private readonly path: string) {}

  private async readDir(): Promise<UserData[]> {
    const data = await fs.readdir(this.path);
    const users = (await Promise.all(
      data
        .map(x => x.replace('.json', ''))
        .map((id) => fs.readFile(this.getFileName(id)))
    )).map(x => JSON.parse(x.toString()));
    return users;
  }

  private getFileName(id: string): string {
    return path.join(this.path, `${id}.json`);
  }

  async migrateFromKeytarToElectronStorage(): Promise<void> {
    // Read all the passwords from keytar.
    // Can include legacy passwords that were saved in the app.
    const passwords = await this.keytarService.loadAll();
    if (Object.keys(passwords).length === 0) {
      console.log('migrateFromKeytarToElectronStorage: No passwords found in keytar');
      return;
    }

    console.log(`migrateFromKeytarToElectronStorage: Found ${Object.keys(passwords).length} passwords in keytar`);
    
    // Read all the users from the users folder.
    const users = await this.readDir();
    if (users.length === 0) {
      console.log('migrateFromKeytarToElectronStorage: No users found in the users folder');
      return;
    }

    console.log(`migrateFromKeytarToElectronStorage: Found ${users.length} users in the users folder`);

    // Merge the two lists based on users.id.
    const merged = users
      .filter(x => !x.password)
      .map(user => ({
        ...user,
        password: passwords[user.id],
      })
    );

    if (merged.length === 0) {
      console.log('migrateFromKeytarToElectronStorage: No users to migrate');
      return;
    }

    console.log(`migrateFromKeytarToElectronStorage: Merged ${merged.length} users`);

    // Save the merged list.
    await Promise.all(merged.map(this.save.bind(this)));
    console.log('migrateFromKeytarToElectronStorage: Migrated from keytar to electron-store');

    // Delete all the passwords from keytar.
    await Promise.all(Object.keys(passwords).map(this.keytarService.delete.bind(this.keytarService)));
    console.log('migrateFromKeytarToElectronStorage: Deleted all passwords from keytar');
  }

  async migrateFromOldAppName(): Promise<void> {
    const oldName = 'Devtools Password Manager';
    const name = electron.app.getName();
    if (name === oldName) {
      console.log(`migrateFromOldAppName: App name is already ${oldName}`);
      return;
    }
    console.log(`migrateFromOldAppName: Changing app name from ${name} to ${oldName}`);
    electron.app.setName(oldName);

    const users = await this.readDir();

    const migratableUsers = users.filter(x => !('version' in x));
    if (migratableUsers.length === 0) {
      console.log('migrateFromOldAppName: No users to migrate');
      return;
    }

    console.log(`migrateFromOldAppName: Found ${migratableUsers.length} users to migrate`);

    try {
      const mappedUsers = await Promise.all(migratableUsers.map(user => {
        user.version = 1;
        user.password = electron.safeStorage.decryptString(Buffer.from(user.password, 'base64'));
        return user;
      }));
      console.log(`migrateFromOldAppName: Migrated ${mappedUsers.length} users`);
    } catch (e) {
      console.error(`migrateFromOldAppName: Failed to migrate users: ${e.message}`);
    } finally {
      console.log(`migrateFromOldAppName: Changing app name back from ${electron.app.name} to ${name}`);
      electron.app.setName(name);
    }
  }

  async loadAll(): Promise<UserData[]> {
    const users = await this.readDir();
    return Promise.all(users.map(this.mapUser.bind(this)));
  }

  private async mapUser(user: UserData) {
    try {
      user.password = electron.safeStorage.decryptString(Buffer.from(user.password, 'base64'));
    } catch (e) {
      user.password = '';
    }
    return user;
  }

  async loadOne(id: string): Promise<UserData> {
    const data = (await fs.readFile(this.getFileName(id))).toString();
    const user = JSON.parse(data);
    return this.mapUser(user);
  }

  async save(user: UserData): Promise<void> {
    user.password = electron.safeStorage.encryptString(user.password).toString('base64');
    await fs.writeFile(this.getFileName(user.id), JSON.stringify(user, null, 2));
  }

  async delete(id: string): Promise<void> {
    void fs.unlink(this.getFileName(id));
  }
};

export async function setupStorage () {
  const dir = path.join(electron.app.getPath('userData'), 'users');
  await fs.mkdir(dir, { recursive: true });
  const userStorage = new UserStorage(dir);
  return userStorage;
};