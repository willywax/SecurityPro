import { createCrudService } from '@/services/serviceFactory';

const userService = createCrudService('/users', 'users');

export default userService;
