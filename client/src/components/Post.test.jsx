import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Post from './Post';

function makePost(overrides = {}) {
  return {
    id: 1,
    monkey_id: 2,
    monkey_name: 'Test Monkey',
    monkey_emoji: '🐵',
    created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    content: 'Post content',
    bananas: 1,
    poops: 2,
    reply_count: 0,
    fling_count: 0,
    is_mine: false,
    is_anonymous: false,
    ...overrides,
  };
}

test('fires reaction handlers when clicked', async () => {
  const user = userEvent.setup();
  const onReact = vi.fn().mockResolvedValue(undefined);
  const onDelete = vi.fn().mockResolvedValue(undefined);
  const onFling = vi.fn().mockResolvedValue(undefined);

  render(
    <MemoryRouter>
      <Post post={makePost()} onReact={onReact} onDelete={onDelete} onFling={onFling} />
    </MemoryRouter>
  );

  await user.click(screen.getByRole('button', { name: /banana reaction/i }));
  await user.click(screen.getByRole('button', { name: /poop reaction/i }));
  await user.click(screen.getByRole('button', { name: /fling/i }));

  expect(onReact).toHaveBeenNthCalledWith(1, 1, 'banana');
  expect(onReact).toHaveBeenNthCalledWith(2, 1, 'poop');
  expect(onFling).toHaveBeenCalledWith(1);
});

test('shows blur overlay for heavily pooped posts', () => {
  render(
    <MemoryRouter>
      <Post post={makePost({ bananas: 1, poops: 10 })} onReact={vi.fn()} onDelete={vi.fn()} onFling={vi.fn()} />
    </MemoryRouter>
  );

  expect(screen.getByText(/this post is/i)).toBeInTheDocument();
});
