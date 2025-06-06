import { useEffect } from 'react';

export function useClickOutside(refs, callback) {
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isOutside = Array.isArray(refs)
        ? refs.every(ref => ref.current && !ref.current.contains(event.target))
        : refs.current && !refs.current.contains(event.target);

      if (isOutside) callback();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [refs, callback]);
}
