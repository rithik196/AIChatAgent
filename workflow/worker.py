import asyncio
import logging
import os
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


def resolve_temporal_address() -> str:
    address = os.getenv("TEMPORAL_ADDRESS", "localhost:7233")
    host, separator, port = address.partition(":")

    # The shared .env is docker-oriented. When the worker runs directly on the
    # host, Docker service DNS names such as "temporal" are not resolvable.
    if host == "temporal" and not os.path.exists("/.dockerenv"):
        fallback = f"localhost{separator}{port}" if separator else "localhost"
        logging.info(
            "TEMPORAL_ADDRESS=%s is a Docker service hostname; using %s for local execution",
            address,
            fallback,
        )
        return fallback

    return address

async def main():
    temporal_address = resolve_temporal_address()
    client = await Client.connect(temporal_address)
    logging.info("Connected to Temporal cluster at %s", temporal_address)

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
