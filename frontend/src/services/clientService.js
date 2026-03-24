import { createCrudService } from '@/services/serviceFactory';

const clientService = createCrudService('/clients', 'clients');

export default clientService;
