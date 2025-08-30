import { isValidUUID, validateUUID, sanitizeUUID } from '../utils';

describe('UUID Validation Utilities', () => {
  describe('isValidUUID', () => {
    it('should return true for valid UUIDs', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
        'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE'
      ];

      validUUIDs.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(true);
      });
    });

    it('should return false for invalid UUIDs', () => {
      const invalidUUIDs = [
        '',
        'undefined',
        'null',
        '123',
        '123e4567-e89b-12d3-a456',
        '123e4567-e89b-12d3-a456-426614174000-extra',
        'gggggggg-gggg-gggg-gggg-gggggggggggg',
        '123e4567_e89b_12d3_a456_426614174000',
        '123e4567-e89b-12d3-a456-42661417400g'
      ];

      invalidUUIDs.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(false);
      });
    });
  });

  describe('validateUUID', () => {
    it('should not throw for valid UUIDs', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      expect(() => validateUUID(validUUID, 'Test')).not.toThrow();
    });

    it('should throw for invalid UUIDs', () => {
      const invalidUUIDs = ['', 'invalid', '123'];
      
      invalidUUIDs.forEach(uuid => {
        expect(() => validateUUID(uuid, 'Test')).toThrow('Invalid Test ID format');
      });
    });
  });

  describe('sanitizeUUID', () => {
    it('should return valid UUIDs as-is', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      expect(sanitizeUUID(validUUID)).toBe(validUUID);
    });

    it('should return null for invalid UUIDs', () => {
      const invalidUUIDs = ['', 'invalid', '123', 'undefined'];
      
      invalidUUIDs.forEach(uuid => {
        expect(sanitizeUUID(uuid)).toBeNull();
      });
    });
  });
});