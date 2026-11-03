-- Each voice note's waveform: the loudest sample in each of 512 equal stretches
-- of the recording, scaled so the loudest is 1, worked out by the browser that
-- recorded it. Players draw it without fetching the audio, as messaging apps
-- send a voice message's waveform along with it. Empty when the browser
-- couldn't decode its own recording; the player then draws it flat.
--
-- Recordings made before this get theirs filled in by decoding their audio,
-- after which 0007 makes it required.
alter table public.recordings add column waveform real[];
