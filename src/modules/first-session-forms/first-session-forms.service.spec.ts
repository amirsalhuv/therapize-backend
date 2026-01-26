import { Test, TestingModule } from '@nestjs/testing';
import { FirstSessionFormsService } from './first-session-forms.service';
import { PrismaService } from '../../database/prisma.service';
import { MilestonesService } from '../milestones/milestones.service';

describe('FirstSessionFormsService', () => {
  let service: FirstSessionFormsService;
  let milestonesService: MilestonesService;

  const mockPrisma = {
    firstSessionForm: { findUnique: jest.fn(), update: jest.fn() },
    programEpisode: { findUnique: jest.fn(), update: jest.fn() },
    patientTherapistRelationship: { update: jest.fn() },
    patientProfile: { update: jest.fn() },
    patientPlan: { create: jest.fn() },
    session: { create: jest.fn() },
  };

  const mockMilestonesService = {
    completeBaselineAssessment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FirstSessionFormsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MilestonesService, useValue: mockMilestonesService },
      ],
    }).compile();

    service = module.get<FirstSessionFormsService>(FirstSessionFormsService);
    milestonesService = module.get<MilestonesService>(MilestonesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have MilestonesService injected', () => {
    expect(milestonesService).toBeDefined();
    expect(milestonesService.completeBaselineAssessment).toBeDefined();
  });

  describe('complete', () => {
    it('should call completeBaselineAssessment when form is completed', async () => {
      const mockForm = {
        id: 'form-1',
        episodeId: 'episode-1',
        basicData: { name: 'Test' },
        therapyGoals: { goals: [{ description: 'Goal 1' }] },
        initialProgram: { exercises: [{ exerciseId: 'ex-1' }] },
        episode: { id: 'episode-1', patientId: 'patient-1', relationshipId: 'rel-1', therapistId: 'therapist-1' },
      };

      mockPrisma.firstSessionForm.findUnique.mockResolvedValue(mockForm);
      mockPrisma.firstSessionForm.update.mockResolvedValue({ ...mockForm, status: 'COMPLETED' });
      mockPrisma.programEpisode.update.mockResolvedValue({});
      mockPrisma.patientTherapistRelationship.update.mockResolvedValue({});
      mockPrisma.patientProfile.update.mockResolvedValue({});
      mockPrisma.patientPlan.create.mockResolvedValue({ id: 'plan-1' });
      mockPrisma.session.create.mockResolvedValue({});
      mockMilestonesService.completeBaselineAssessment.mockResolvedValue({ id: 'milestone-1' });

      await service.complete('form-1', 'therapist-1');

      expect(mockMilestonesService.completeBaselineAssessment).toHaveBeenCalledWith('episode-1');
    });
  });
});
