-- Every recording has its waveform by now (see 0006).
alter table public.recordings alter column waveform set not null;
