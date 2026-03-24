import { createCrudService } from '@/services/serviceFactory';

const siteService = createCrudService('/sites', 'sites');

export default siteService;
