import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PostComposer from './PostComposer';

test('submits post and resets fields', async () => {
  const user = userEvent.setup();
  const onPost = vi.fn().mockResolvedValue(undefined);

  render(<PostComposer onPost={onPost} />);

  const textarea = screen.getByPlaceholderText(/fling your thoughts/i);
  await user.type(textarea, 'Hello monkeys');
  await user.click(screen.getByRole('button', { name: /fling it/i }));

  expect(onPost).toHaveBeenCalledTimes(1);
  expect(onPost).toHaveBeenCalledWith('Hello monkeys', {
    parent_id: null,
    troop_id: null,
    is_anonymous: false,
    image_url: null,
  });
  expect(textarea).toHaveValue('');
});

test('enforces character limit of 500', async () => {
  const user = userEvent.setup();
  const onPost = vi.fn().mockResolvedValue(undefined);
  render(<PostComposer onPost={onPost} />);

  const textarea = screen.getByPlaceholderText(/fling your thoughts/i);
  const longText = 'a'.repeat(510);
  await user.type(textarea, longText);

  expect(textarea).toHaveValue('a'.repeat(500));
});
