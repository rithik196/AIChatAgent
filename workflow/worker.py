import asyncio
import logging
from temporalio.client import Client
from temporalio.worker import Worker
from dotenv import load_dotenv

from workflow.workflows.rlos_workflow import RLOSWorkflow
from workflow.activities.mock_activities import (
    mock_nafath_push,
    mock_simah_pull,
    mock_docusign_send,
    mock_core_banking_transfer
)

load_dotenv()
logging.basicConfig(level=logging.INFO)

async def main():
    # Connect to the local Temporal cluster running via Docker
    client = await Client.connect("localhost:7233")
    logging.info("Connected to Temporal cluster at localhost:7233")

    # Run the worker
    worker = Worker(
        client,
        task_queue="rlos-queue",
        workflows=[RLOSWorkflow],
        activities=[
            mock_nafath_push,
            mock_simah_pull,
            mock_docusign_send,
            mock_core_banking_transfer
        ],
    )
    logging.info("Starting Temporal Worker on task queue 'rlos-queue'...")
    await worker.run()

if __name__ == "__main__":
    asyncio.run(main())
