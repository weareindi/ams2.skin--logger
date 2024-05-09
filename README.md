# AMS2.skin Logger

## Usage:
- Load AMS2
- Double click ams2logger.exe. A window should appear showing you whats going on.

## How does it work?
Every second, ams2logger grabs a snapshot of the data from CREST2 (your current AMS2 game session) and formats it so we're just using the data we need for comparison.  
When you're at the circuit, the logger should start logging. You can then check these logs after your session.

## NOTICE
Please don't forward the logs on to me. We'll arrange a session in the near future so we're all working together.

## What is CREST2 and why am I getting a network warning?
CREST2 is a tool that converts the shared memory from AMS2 into JSON... a format I understand.
I'm also quite sure it's what Crew Chief uses under the hood.  
You're getting a network warning as it creates a localhost server for me to fetch the data from. That's what the warning is you're probably seeing when you first load it up.