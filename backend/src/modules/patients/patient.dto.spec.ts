import { isValidCoreMeasurement } from './patient-measurement-rules';

describe('patient measurement rules',()=>{
  it('accepts the required registration measurements',()=>expect(isValidCoreMeasurement({systolicBloodPressure:120,diastolicBloodPressure:80,weightKg:65.5,heightCm:170})).toBe(true));
  it('rejects an unreasonable blood pressure',()=>expect(isValidCoreMeasurement({systolicBloodPressure:500,diastolicBloodPressure:80,weightKg:65.5,heightCm:170})).toBe(false));
  it('rejects missing-equivalent zero weight or height',()=>expect(isValidCoreMeasurement({systolicBloodPressure:120,diastolicBloodPressure:80,weightKg:0,heightCm:0})).toBe(false));
});
