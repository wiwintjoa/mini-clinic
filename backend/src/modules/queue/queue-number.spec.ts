describe('queue number format',()=>{it('documents the daily queue format',()=>expect(`A-${String(7).padStart(3,'0')}`).toBe('A-007'));});
