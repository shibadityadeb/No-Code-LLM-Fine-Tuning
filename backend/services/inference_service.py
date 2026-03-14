# Placeholder inference service.
# In a real setup, this would load the fine-tuned adapter and run it through a model.

def generate_response(prompt: str) -> str:
    """Generate a response for the given prompt."""
    # TODO: connect to a real model or inference endpoint
    return f"Echo: {prompt}"
