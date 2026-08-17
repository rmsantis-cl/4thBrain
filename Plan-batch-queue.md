# Queue/Plan

## Goal
create a set of sill tooks to add tasks to a queue to be executer later. Task don't needed LLM won't use LLM.

## Tasks
- `add question` : add a job to the queue to be executed in Claude batch
- `add url` : add an url to be fetch by Linux script
- `status` : list pending, executed and failed  jobs 
- `research [level=X] url` : 
  - to be executed only when url is added and indexed. 
  - if (level>=1) will obtain list of referenced urls and will enqueue to download and research [level-1] url
  - Once referenced urls -if there are- are completed it will sumirize this note and will include quotations - with proper citation - from the referenced urls .
- `cancel [batch-id]` : the batch id is returned when a task is added 
- `pause [batch-id]` : it will hold the task until it is contined
- `continue [batch-id]` : restore the task to active and wait for its turn to be executed
## Memory
There's a list of pending, completed, and failed tasks. Completed task will have a timestamp of when it was completed. Any LLM task that dependes in it will wait 5 minutes before being execute to wait for its indexation. 
### Note 
Research a more effective way to determine if a added note or url was already indexed.
