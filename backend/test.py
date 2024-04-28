#
# import os
# print([name for name in os.listdir("./models") if os.path.isdir(os.path.join("./models", name))])
#
# from mlx_lm import load , generate 
# from typing import Optional , List
# import mlx.nn as nn
# import mlx.core as mx
# from mlx_lm.utils import generate_step
# model, tokenizer = load("./models/Llama-3-8b-Instruct-Q8")
# # print(generate(model, tokenizer , "2 + 2 = " , temp=2))
# print("ji")
#
#
# def convert_chat(messages: List[dict], role_mapping: Optional[dict] = {
#         "bos": "<|begin_of_text|>",
#         "system": "<|start_header_id|>system<|end_header_id|>",
#         "user": "<|start_header_id|>user<|end_header_id|>",
#         "assistant": "<|start_header_id|>assistant<|end_header_id|> ",
#         "stop": "<|eot_id|>",
#         "eos": "<|end_of_text|>",
#         
#         }):
#
#     prompt = ""
#     
#     prompt += role_mapping.get("bos", "")
#
#     for line in messages:
#         role_prefix = role_mapping.get(line["role"], "")
#         stop = role_mapping.get("stop", "")
#         content = line.get("content", "")
#         prompt += f"{role_prefix}{content}{stop}"
#
#     prompt += role_mapping.get("assistant", "")
#     return prompt.rstrip()
#
# messages = [{"role": "user", "content": "what is 2 + 2"}]
# print(messages)
# print("ji3")
# prompt = convert_chat(messages)
#
# eos = mx.array(tokenizer.encode("<|end_of_id|>")) 
#
#
#
# def get_stream():
#     encoded_prompt = mx.array(tokenizer.encode(prompt))
#     res = ""
#     final_res = ""
#     tokens = []
#     eos = mx.array(tokenizer.encode("<|end_of_id|>")) 
#
#     for token, _ in generate_step(encoded_prompt, model):
#         if token == tokenizer.eos_token_id: 
#             break
#
#         inl = len(res)
#         tokens.append(token)
#         res = tokenizer.decode(tokens)
#         final_res += res[inl:]
#
#         if  "<|eot_id|>" in final_res: 
#
#             print("\n \n ture     ------ " , res)
#             break
#
#         yield res[inl:]
#
# for val in get_stream():
#     print( "\n" + val, end="", flush=True)
# #
# # os.system("python -m mlx_lm.convert --hf-path mlx-community/Meta-Llama-3-8B-Instruct-4bit --mlx-path ./models/Llama-3-8b-Instruct-Q8 -q --q-bits 1 ")  
#


import pygame
import random
import sys

# Initialize Pygame
pygame.init()

# Set up some constants
WIDTH = 800
HEIGHT = 600
SPEED = 10
SNAKE_SIZE = 20
APPLE_SIZE = 20

# Set up some colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
RED = (255, 0, 0)

# Set up the display
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption('Snake')

# Set up the snake and apple
snake_x = WIDTH // 2
snake_y = HEIGHT // 2
snake_dir = 'right'
snake_body = [(snake_x, snake_y)]
apple_x = random.randint(0, WIDTH - APPLE_SIZE) // APPLE_SIZE * APPLE_SIZE
apple_y = random.randint(0, HEIGHT - APPLE_SIZE) // APPLE_SIZE * APPLE_SIZE

# Game loop
while True:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            pygame.quit()
            sys.exit()
        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_UP and snake_dir!= 'down':
                snake_dir = 'up'
            elif event.key == pygame.K_DOWN and snake_dir!= 'up':
                snake_dir = 'down'
            elif event.key == pygame.K_LEFT and snake_dir!= 'right':
                snake_dir = 'left'
            elif event.key == pygame.K_RIGHT and snake_dir!= 'left':
                snake_dir = 'right'

    # Move the snake
    if snake_dir == 'up':
        snake_y -= SNAKE_SIZE
    elif snake_dir == 'down':
        snake_y += SNAKE_SIZE
    elif snake_dir == 'left':
        snake_x -= SNAKE_SIZE
    elif snake_dir == 'right':
        snake_x += SNAKE_SIZE

    # Add the new head to the snake body
    snake_body.insert(0, (snake_x, snake_y))

    # Check for collision with wall
    if snake_x < 0 or snake_x >= WIDTH or snake_y < 0 or snake_y >= HEIGHT:
        pygame.quit()
        sys.exit()

    # Check for collision with apple
    if snake_x == apple_x and snake_y == apple_y:
        apple_x = random.randint(0, WIDTH - APPLE_SIZE) // APPLE_SIZE * APPLE_SIZE
        apple_y = random.randint(0, HEIGHT - APPLE_SIZE) // APPLE_SIZE * APPLE_SIZE
    else:
        snake_body.pop()

    # Check for collision with self
    for body_part in snake_body[1:]:
        if snake_x == body_part[0] and snake_y == body_part[1]:
            pygame.quit()
            sys.exit()

    # Draw everything
    screen.fill(BLACK)
    for part in snake_body:
        pygame.draw.rect(screen, WHITE, (part[0], part[1], SNAKE_SIZE, SNAKE_SIZE))
    pygame.draw.rect(screen, RED, (apple_x, apple_y, APPLE_SIZE, APPLE_SIZE))

    # Update the display
    pygame.display.flip()

    # Cap the frame rate
    pygame.time.delay(1000 // SPEED)
