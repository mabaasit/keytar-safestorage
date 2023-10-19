import keytar from 'keytar';

export class KeytarService {

  getKeytarServiceName(): string {
    return 'SAFE_STORAGE_SERVICE';
  }

  async loadAll(): Promise<Record<string, string>> {
    const credentials = await keytar.findCredentials(this.getKeytarServiceName());
    return Object.fromEntries(credentials.map(({ account, password }) => [
      account,
      JSON.parse(password)?.password,
    ]));
  }

  async loadOne(id: string): Promise<string | undefined> {
    const password = await keytar.getPassword(this.getKeytarServiceName(), id);
    if (!password) return undefined;
    return JSON.parse(password)?.password;
  }

  async save(id: string, password: string): Promise<void> {
    await keytar.setPassword(
      this.getKeytarServiceName(),
      id,
      JSON.stringify({ password }, null, 2)
    );
  }

  async delete(id: string): Promise<void> {
    await keytar.deletePassword(this.getKeytarServiceName(), id);
  }
}
