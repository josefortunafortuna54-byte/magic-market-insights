-- ============================================================
-- HORA DO BOOM — Lista COMPLETA (escala de 45 min)
-- 32 janelas WAT de 00:30 às 23:45, ciclo de 45 em 45 minutos.
-- WAT = UTC+1. Substitui totalmente a tabela boom_hours.
-- Híbrido: as 17 sessões conhecidas mantêm layout (título/pares/
-- volumen/badge/descrição); as 15 janelas restantes são genéricas.
-- Idempotente: DELETE + INSERT.
-- ============================================================

DELETE FROM public.boom_hours;

INSERT INTO public.boom_hours (title, time_wat, time_gmt, pairs, days, description, volatility, badge, is_active) VALUES
  ('Boom da Noite',        '00:30', '23:30', ARRAY['USDJPY','NZDUSD','AUDUSD'], '', 'Sessão asiática nocturna — liquidez reduzida.',       2, '🌙', true),
  ('BOOM',                 '01:15', '00:15', ARRAY['XAUUSD'],          '', 'Janela de 45 min — oportunidade de sessão.',          5, '⚡', true),
  ('Boom de Tóquio',       '02:00', '01:00', ARRAY['USDJPY','AUDUSD','NZDUSD'], '', 'Sessão asiática — pares com JPY.',                   2, '🇯🇵', true),
  ('Boom da Ásia',         '02:45', '01:45', ARRAY['AUDUSD','NZDUSD','USDJPY'], '', 'Mercados asiáticos em movimento.',                   2, '🌏', true),
  ('BOOM',                 '03:30', '02:30', ARRAY['XAUUSD'],          '', 'Janela de 45 min — oportunidade de sessão.',          5, '⚡', true),
  ('BOOM',                 '04:15', '03:15', ARRAY['XAUUSD'],          '', 'Janela de 45 min — oportunidade de sessão.',          5, '⚡', true),
  ('Boom de Sydney',       '05:00', '04:00', ARRAY['AUDUSD','NZDUSD'], '', 'Abertura da Oceânia.',                               2, '🇦🇺', true),
  ('BOOM',                 '05:45', '04:45', ARRAY['XAUUSD'],          '', 'Janela de 45 min — oportunidade de sessão.',          5, '⚡', true),
  ('Boom Ásia/Europa',     '06:30', '05:30', ARRAY['EURUSD','AUDUSD','USDJPY'], '', 'Transição Ásia/Europa.',                            3, '🌅', true),
  ('BOOM',                 '07:15', '06:15', ARRAY['XAUUSD'],          '', 'Janela de 45 min — oportunidade de sessão.',          5, '⚡', true),
  ('Boom de Frankfurt',    '08:00', '07:00', ARRAY['EURUSD','EURGBP','USDCHF'], '', 'Abertura europeia — pares com EUR.',                 3, '🇩🇪', true),
  ('BOOM',                 '08:45', '07:45', ARRAY['XAUUSD'],          '', 'Janela de 45 min — oportunidade de sessão.',          5, '⚡', true),
  ('Boom Pré-Londres',     '09:30', '08:30', ARRAY['EURUSD','GBPUSD','XAUUSD'], '', 'Aproximação da abertura de Londres.',                4, '🎯', true),
  ('BOOM',                 '10:15', '09:15', ARRAY['XAUUSD'],          '', 'Janela de 45 min — oportunidade de sessão.',          5, '⚡', true),
  ('Boom de Londres',      '11:00', '10:00', ARRAY['EURUSD','GBPUSD','XAUUSD','EURGBP'], '', 'Maior liquidez forex do dia.',                       4, '🇬🇧', true),
  ('BOOM',                 '11:45', '10:45', ARRAY['XAUUSD'],          '', 'Janela de 45 min — oportunidade de sessão.',          5, '⚡', true),
  ('Boom Londres Meio-Dia','12:30', '11:30', ARRAY['GBPUSD','EURUSD','XAUUSD'], '', 'Londres em plena sessão.',                           4, '📊', true),
  ('BOOM',                 '13:15', '12:15', ARRAY['XAUUSD'],          '', 'Janela de 45 min — oportunidade de sessão.',          5, '⚡', true),
  ('Boom Overlap',         '14:00', '13:00', ARRAY['EURUSD','GBPUSD','USDCAD','XAUUSD'], '', 'Overlap Londres / NY — máxima volatilidade.',        5, '🔥', true),
  ('BOOM',                 '14:45', '13:45', ARRAY['XAUUSD'],          '', 'Janela de 45 min — oportunidade de sessão.',          5, '⚡', true),
  ('Boom de Nova Iorque',  '15:30', '14:30', ARRAY['EURUSD','GBPUSD','USDCAD','XAUUSD'], '', 'Sessão americana com alta liquidez.',                4, '🇺🇸', true),
  ('BOOM',                 '16:15', '15:15', ARRAY['XAUUSD'],          '', 'Janela de 45 min — oportunidade de sessão.',          5, '⚡', true),
  ('Boom NY Tarde',        '17:00', '16:00', ARRAY['USDCAD','USDJPY','XAUUSD'], '', 'Sessão americana da tarde.',                         3, '🏙️', true),
  ('Boom NY Tarde II',     '17:45', '16:45', ARRAY['GBPUSD','USDCAD','XAUUSD'], '', 'Nova Iorque — segunda janela.',                      3, '💰', true),
  ('Boom NY Fecho',        '18:30', '17:30', ARRAY['USDCAD','XAUUSD','EURUSD'], '', 'Fecho da sessão americana.',                         3, '🌆', true),
  ('BOOM',                 '19:15', '18:15', ARRAY['XAUUSD'],          '', 'Janela de 45 min — oportunidade de sessão.',          5, '⚡', true),
  ('Boom Pós-NY',          '20:00', '19:00', ARRAY['USDJPY','XAUUSD'], '', 'Depois da sessão americana.',                        2, '🚀', true),
  ('BOOM',                 '20:45', '19:45', ARRAY['XAUUSD'],          '', 'Janela de 45 min — oportunidade de sessão.',          5, '⚡', true),
  ('Boom da Noite',        '21:30', '20:30', ARRAY['USDJPY','AUDUSD'], '', 'Sessão nocturna.',                                   2, '🌙', true),
  ('Boom Asia Night',      '22:15', '21:15', ARRAY['USDJPY','AUDUSD','NZDUSD'], '', 'Início da sessão asiática.',                         2, '🌃', true),
  ('BOOM',                 '23:00', '22:00', ARRAY['XAUUSD'],          '', 'Janela de 45 min — oportunidade de sessão.',          5, '⚡', true),
  ('BOOM',                 '23:45', '22:45', ARRAY['XAUUSD'],          '', 'Janela de 45 min — oportunidade de sessão.',          5, '⚡', true);