// TODO: Implement RBAC (Role-Based Access Control)
class RBACManager {
  checkPermission(_role: string, _resource: string): boolean {
    return false;
  }

  assignRole(_userId: string, _role: string): void {}

  getRoles(_userId: string): string[] {
    return [];
  }
}

export const rbacManager = new RBACManager();
