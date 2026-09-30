-- Fix WooCommerce event: assign to correct widget and fix product URL
UPDATE events 
SET 
  widget_id = '86392eb2-3f38-4f15-afab-c92cd87004b3',
  event_data = jsonb_set(event_data, '{product_url}', '"https://gigalagosdigital.com/shop/product/web-design/"')
WHERE id = '3c7acc38-ffa2-4d64-8888-ad5772b1afec';