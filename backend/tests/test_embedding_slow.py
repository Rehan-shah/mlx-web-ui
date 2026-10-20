import pytest

import main


@pytest.mark.slow
def test_real_embedding_similarity():
    if not main.BERT_WEIGHTS.exists():
        pytest.skip("embedding weights not converted")
    fn = main.MlxEmbedding(main.BERT_DIR, main.BERT_WEIGHTS)
    a, b, c = fn(["A cat sits on the mat.", "A kitten is sitting on a rug.", "Quarterly tax filing deadlines."])
    dot = lambda x, y: sum(i * j for i, j in zip(x, y))
    assert len(a) == 384
    assert abs(dot(a, a) - 1) < 1e-3
    assert dot(a, b) > dot(a, c)
