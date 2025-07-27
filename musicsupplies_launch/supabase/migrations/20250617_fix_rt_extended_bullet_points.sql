-- Fix bullet points in rt_extended.ext_descr
UPDATE rt_extended
SET ext_descr = 
    REPLACE(
        REPLACE(
            REPLACE(ext_descr, 'GÇó ', '<li>'), 
            'GÇó', '<li>'
        ),
        E'\n', '</li><li>'
    )
WHERE ext_descr LIKE '%GÇó%';

-- Wrap the content in <ul> tags if it contains <li> tags
UPDATE rt_extended
SET ext_descr = 
    CASE 
        WHEN ext_descr LIKE '%<li>%' AND NOT (ext_descr LIKE '<ul>%</ul>') THEN
            '<ul>' || ext_descr || '</ul>'
        ELSE
            ext_descr
    END
WHERE ext_descr LIKE '%GÇó%';

-- Remove any empty <li> tags that might have been created at the beginning or end
UPDATE rt_extended
SET ext_descr = 
    REPLACE(
        REPLACE(ext_descr, '<li></li>', ''),
        '<ul><li></ul>', '<ul></ul>'
    );

-- Ensure the first <li> is not preceded by </li> and the last </li> is not followed by <li>
UPDATE rt_extended
SET ext_descr = 
    REPLACE(
        REPLACE(ext_descr, '</li><ul>', '<ul>'),
        '</ul><li>', '</ul>'
    );

-- Final cleanup: remove any remaining <li> at the very beginning if it's not part of a list
UPDATE rt_extended
SET ext_descr = 
    CASE 
        WHEN ext_descr LIKE '<li>%' AND NOT (ext_descr LIKE '<ul>%') THEN
            SUBSTRING(ext_descr FROM 5)
        ELSE
            ext_descr
    END;

-- Final cleanup: remove any remaining </li> at the very end if it's not part of a list
UPDATE rt_extended
SET ext_descr = 
    CASE 
        WHEN ext_descr LIKE '%</li>' AND NOT (ext_descr LIKE '%</ul>') THEN
            SUBSTRING(ext_descr FROM 1 FOR LENGTH(ext_descr) - 5)
        ELSE
            ext_descr
    END;
