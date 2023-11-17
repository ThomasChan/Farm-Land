import React from 'react';
import { atom, useAtom } from 'jotai';
import { useMutation } from '@tanstack/react-query';
import { Input, MessagePlugin } from 'tdesign-react';

export const auth = atom(false);

export default function Auth({ children }) {
  const [password, setPassword] = React.useState('');
  const [isLoggedIn, setLoggedIn] = useAtom(auth);
  const mutation = useMutation({
    mutationFn: () => {
      if (!password.trim()) {
        return;
      }
      return fetch(`${process.env.REACT_APP_AUTH_API}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body: password }),
      })
      .then(res => {
        if (res.status !== 200) {
          return setLoggedIn(false);
        }
        return setLoggedIn(true);
      }).catch(err => {
        MessagePlugin.error(err.message);
        return setLoggedIn(false);
      });
    },
  });

  if (!isLoggedIn) {
    if (mutation.isPending) {
      return <div className='fixed top-0 left-0 right-0 bottom-0 m-[auto] w-[fit-content] h-[fit-content]'>initializing...</div>;
    }
    return <div className='fixed top-0 left-0 right-0 bottom-0 m-[auto] w-[250px] h-[32px]'>
      <Input
        placeholder='Enter Password'
        onChange={setPassword}
        onEnter={mutation.mutate} />
      <button
        onClick={mutation.mutate}
        className="absolute z-[2] p-1 rounded-md text-gray-500 top-[50%] mt-[-12px] !w-[24px] !h-[24px] right-0 md:bottom-2.5 md:right-1 hover:bg-gray-100 dark:hover:text-gray-400 dark:hover:bg-gray-900 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent">
        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 20 20" className="w-4 h-4 rotate-90" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
        </svg>
      </button>
    </div>
  }

  return children;
}
