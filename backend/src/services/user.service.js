export class UserService {
  constructor(userRepo) {
    this.userRepo = userRepo;
  }

  async list({ role } = {}) {
    return await this.userRepo.list({ role });
  }

  async listEngineersAvailable() {
    return await this.userRepo.listEngineersAvailable();
  }

  
}

export async function listEngineers() {
  return await handle(await fetch(`${API_URL}/users?role=ENGINEER`, { headers: headers() }));
}

