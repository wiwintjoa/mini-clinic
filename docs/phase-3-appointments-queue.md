# Phase 3: Appointments and Queue

Phase 3 introduces doctor profiles, recurring weekly schedules, clinic services, appointments and transactional check-in. Appointment creation validates active references, schedule coverage, breaks, daily capacity and doctor time conflicts. Check-in atomically changes appointment state, allocates a daily `A-001` queue number and creates the queue record. Reception can manage all queues; doctors receive only their assigned queue.
