import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it('should return health status', () => {
    const result = controller.health();
    expect(result).toHaveProperty('status', 'ok');
    expect(result).toHaveProperty('service', 'verity-backend');
    expect(result).toHaveProperty('timestamp');
  });
});
